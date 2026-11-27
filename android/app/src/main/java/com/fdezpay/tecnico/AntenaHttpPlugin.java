package com.fdezpay.tecnico;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * HTTP hacia las antenas Ubiquiti de la red local. airOS obliga a HTTPS con
 * un certificado autofirmado que Android rechaza; aquí se acepta, pero SOLO
 * para IPs privadas (192.168.x, 10.x, 172.16-31.x, 169.254.x). Nada de esto
 * toca la conexión con el sistema, que sigue validando su certificado.
 * No sigue redirecciones y no guarda cookies: eso lo maneja la página.
 */
@CapacitorPlugin(name = "AntenaHttp")
public class AntenaHttpPlugin extends Plugin {

    private final ExecutorService hilos = Executors.newCachedThreadPool();
    private static SSLSocketFactory confiarEnTodo;

    private static synchronized SSLSocketFactory fabricaSinValidar() throws Exception {
        if (confiarEnTodo == null) {
            TrustManager[] confianza = new TrustManager[] {
                new X509TrustManager() {
                    public void checkClientTrusted(X509Certificate[] c, String t) {}
                    public void checkServerTrusted(X509Certificate[] c, String t) {}
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                }
            };
            SSLContext contexto = SSLContext.getInstance("TLS");
            contexto.init(null, confianza, new java.security.SecureRandom());
            confiarEnTodo = contexto.getSocketFactory();
        }
        return confiarEnTodo;
    }

    /** Solo IPs escritas como número y privadas: nunca un nombre de dominio. */
    static boolean esIpLocal(String host) {
        if (host == null || !host.matches("^\\d{1,3}(\\.\\d{1,3}){3}$")) return false;
        try {
            InetAddress ip = InetAddress.getByName(host);
            return ip.isSiteLocalAddress() || ip.isLinkLocalAddress();
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void request(PluginCall call) {
        hilos.execute(() -> {
            HttpURLConnection conexion = null;
            try {
                URL url = new URL(call.getString("url", ""));
                if (!esIpLocal(url.getHost())) {
                    call.reject("Solo se permiten IPs de la red local");
                    return;
                }
                conexion = (HttpURLConnection) url.openConnection();
                if (conexion instanceof HttpsURLConnection) {
                    HttpsURLConnection segura = (HttpsURLConnection) conexion;
                    segura.setSSLSocketFactory(fabricaSinValidar());
                    segura.setHostnameVerifier((nombre, sesion) -> true);
                }
                int espera = call.getInt("timeoutMs", 8000);
                conexion.setConnectTimeout(espera);
                conexion.setReadTimeout(espera * 2);
                conexion.setInstanceFollowRedirects(false);
                conexion.setUseCaches(false);
                String metodo = call.getString("method", "GET");
                conexion.setRequestMethod(metodo);

                JSObject cabeceras = call.getObject("headers", new JSObject());
                Iterator<String> llaves = cabeceras.keys();
                while (llaves.hasNext()) {
                    String llave = llaves.next();
                    conexion.setRequestProperty(llave, cabeceras.getString(llave));
                }

                JSArray campos = call.getArray("campos", null);
                JSObject formulario = call.getObject("formulario", null);
                if (campos != null) {
                    escribirMultipart(conexion, campos);
                } else if (formulario != null) {
                    escribirFormulario(conexion, formulario);
                }

                int estado = conexion.getResponseCode();
                JSObject respuestaCabeceras = new JSObject();
                for (Map.Entry<String, List<String>> e : conexion.getHeaderFields().entrySet()) {
                    if (e.getKey() == null) continue;
                    respuestaCabeceras.put(e.getKey(), String.join(", ", e.getValue()));
                }
                InputStream entrada = estado >= 400 ? conexion.getErrorStream() : conexion.getInputStream();
                String cuerpo = "";
                if (entrada != null) {
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    byte[] bufer = new byte[8192];
                    int leidos;
                    while ((leidos = entrada.read(bufer)) != -1) bytes.write(bufer, 0, leidos);
                    cuerpo = bytes.toString("UTF-8");
                }
                JSObject resultado = new JSObject();
                resultado.put("status", estado);
                resultado.put("headers", respuestaCabeceras);
                resultado.put("data", cuerpo);
                call.resolve(resultado);
            } catch (Exception e) {
                call.reject(e.getClass().getSimpleName() + ": " + e.getMessage());
            } finally {
                if (conexion != null) conexion.disconnect();
            }
        });
    }

    private static void escribirFormulario(HttpURLConnection conexion, JSObject datos) throws Exception {
        StringBuilder cuerpo = new StringBuilder();
        Iterator<String> llaves = datos.keys();
        while (llaves.hasNext()) {
            String llave = llaves.next();
            if (cuerpo.length() > 0) cuerpo.append('&');
            cuerpo.append(URLEncoder.encode(llave, "UTF-8")).append('=')
                  .append(URLEncoder.encode(datos.getString(llave), "UTF-8"));
        }
        conexion.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        enviar(conexion, cuerpo.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** El lighttpd de airOS no entiende cuerpos "chunked": va completo y con su tamaño. */
    private static void enviar(HttpURLConnection conexion, byte[] cuerpo) throws Exception {
        conexion.setDoOutput(true);
        conexion.setFixedLengthStreamingMode(cuerpo.length);
        try (java.io.OutputStream salida = conexion.getOutputStream()) {
            salida.write(cuerpo);
        }
    }

    /** campos: [{key, value, type: "string"}] o [{key, value(base64), type: "base64File", fileName, contentType}]. */
    private static void escribirMultipart(HttpURLConnection conexion, JSArray campos) throws Exception {
        String limite = "----FdezPay" + UUID.randomUUID().toString().replace("-", "");
        conexion.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + limite);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (DataOutputStream salida = new DataOutputStream(bytes)) {
            for (int i = 0; i < campos.length(); i++) {
                JSONObject campo = campos.getJSONObject(i);
                String tipo = campo.optString("type", "string");
                salida.writeBytes("--" + limite + "\r\n");
                if ("base64File".equals(tipo)) {
                    salida.writeBytes("Content-Disposition: form-data; name=\"" + campo.getString("key")
                        + "\"; filename=\"" + campo.optString("fileName", "archivo") + "\"\r\n");
                    salida.writeBytes("Content-Type: " + campo.optString("contentType", "application/octet-stream") + "\r\n\r\n");
                    salida.write(android.util.Base64.decode(campo.getString("value"), android.util.Base64.DEFAULT));
                } else {
                    salida.writeBytes("Content-Disposition: form-data; name=\"" + campo.getString("key") + "\"\r\n\r\n");
                    salida.write(campo.optString("value", "").getBytes(StandardCharsets.UTF_8));
                }
                salida.writeBytes("\r\n");
            }
            salida.writeBytes("--" + limite + "--\r\n");
        }
        enviar(conexion, bytes.toByteArray());
    }
}
