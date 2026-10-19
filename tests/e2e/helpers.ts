import type { Page } from '@playwright/test'

export async function authenticateAs(
  page: Page,
  role: 'admin' | 'supervisor' | 'tecnico' | 'cajero' = 'admin',
) {
  const user = {
      id: 1,
      usuario: `${role}-e2e`,
      nombre_completo: 'Usuario E2E',
      rol: role,
  }
  await page.context().addCookies([{
    name: 'fdeznet_access',
    value: 'e2e-session-cookie',
    url: 'http://127.0.0.1:4173',
    httpOnly: true,
    sameSite: 'Strict',
  }])
  await page.goto('/login')
  await page.evaluate((sessionUser) => {
    localStorage.setItem('user', JSON.stringify(sessionUser))
  }, user)
  await page.addInitScript((sessionUser) => {
    localStorage.setItem('user', JSON.stringify(sessionUser))
  }, user)
}

export async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    let body: unknown = []

    if (url.pathname.endsWith('/auth/login')) {
      body = {
        access_token: 'e2e-token',
        token_type: 'bearer',
        user: { id: 1, usuario: 'admin-e2e', rol: 'admin' },
      }
    } else if (url.pathname.endsWith('/olts/2/monitoreo-api')) {
      body = {
        status: 'success',
        data: {
          clientes_activos: [],
          clientes_caidos: [],
          onus_api: [
            {
              onu_id: 'GPON0/1:3', pon_id: '1', serial: 'HWTC0000AAAA', identificador: 'HWTC0000AAAA',
              estado_fisico: 'online', status: 'online', rx_power: '-19.96', tx_power: '2.33', modelo: 'HG8145V5',
              causa_ultima_caida: { tipo: 'corte_luz', detalle: 'Se quedó sin luz eléctrica (apagón o la desconectaron)', original: 'Power Off' },
            },
            {
              onu_id: 'GPON0/1:4', pon_id: '1', serial: 'HWTC0000BBBB', identificador: 'HWTC0000BBBB',
              estado_fisico: 'offline', status: 'offline', modelo: 'unknown',
              causa_ultima_caida: { tipo: 'fibra', detalle: 'Perdió la señal de la fibra', original: 'ONU Signal LOS' },
            },
          ],
        },
      }
    } else if (url.pathname.endsWith('/olts/2/onus/1/3/detalle')) {
      body = {
        status: 'success',
        data: {
          pon: 1, onuid: 3, distancia_m: 1440, temperatura_c: 40, voltaje_v: 3.32, corriente_laser_ma: 10,
          rx_dbm: -19.96, tx_dbm: 2.33, rx_minimo_dbm: -25, rx_maximo_dbm: -8, encendida_segundos: 89035,
          firmware: 'V5R022C00S266', version_hardware: '2C6D.A', estado_operativo: 'enable', estado_admin: 'unlock',
          historial_caidas: [{ fecha: '2026/10/01 21:10:05', tipo: 'corte_luz', detalle: 'Se quedó sin luz eléctrica', original: 'Power Off' }],
        },
      }
    } else if (url.pathname.endsWith('/olts/2/onus/1/3/reiniciar')) {
      body = { status: 'success', data: { reiniciada: true } }
    } else if (url.pathname.endsWith('/olts/') && route.request().method() === 'GET') {
      body = [
        { id: 1, nombre: 'OLT Centro', ip: '10.0.0.2', tecnologia: 'GPON', tipo_integracion: 'vsol_api', api_enabled: true },
        { id: 2, nombre: 'OLT Paraíso', ip: '10.0.0.3', tecnologia: 'GPON', tipo_integracion: 'vsol_api', api_enabled: true },
      ]
    } else if (url.pathname.endsWith('/whatsapp/no-leidos')) {
      body = {}
    } else if (url.pathname.endsWith('/whatsapp/chat/1')) {
      body = []
    } else if (url.pathname.endsWith('/whatsapp/configuracion')) {
      body = { intervalo_default: 60 }
    } else if (url.pathname.endsWith('/whatsapp/status')) {
      body = { connected: false, qr: null, active: false }
    } else if (url.pathname.endsWith('/whatsapp/salidas')) {
      body = {
        items: [{
          id: 99,
          cliente_id: 1,
          cliente: { id: 1, nombre: 'Cliente E2E' },
          telefono: '5215550000000',
          mensaje: 'Recordatorio E2E',
          tipo_mensaje: 'texto',
          tipo_evento: 'recordatorio',
          lote_id: null,
          estado_envio: 'fallido',
          ack: -1,
          wa_id: null,
          intentos: 3,
          max_intentos: 3,
          reintentos_manuales: 0,
          ultimo_error: 'WhatsApp desconectado',
          fecha: '2026-07-29T10:00:00Z',
        }],
        total: 1,
        pagina: 1,
        limite: 30,
        resumen: {
          total: 1,
          pendiente: 0,
          procesando: 0,
          enviado: 0,
          entregado: 0,
          leido: 0,
          fallido: 1,
          incierto: 0,
        },
        cola_memoria: 0,
      }
    } else if (url.pathname.endsWith('/configuracion/plantillas-facturacion')) {
      body = []
    } else if (url.pathname.endsWith('/inventario/stock')) {
      body = { disponibles: 1, minimo: 5, bajo: true }
    } else if (url.pathname.endsWith('/inventario/')) {
      body = [{
        id: 1,
        identificador: 'ONU-STOCK-E2E',
        tecnologia: 'GPON',
        modelo: 'ZTE F670L',
        estado: 'DISPONIBLE',
        tecnico_id: null,
        cliente_nombre: null,
        cliente_zona: null,
      }]
    } else if (url.pathname.endsWith('/usuarios/')) {
      body = [{ id: 2, usuario: 'tecnico-e2e', nombre_completo: 'Técnico E2E', rol: 'tecnico' }]
    } else if (url.pathname.endsWith('/configuracion/licencia')) {
      body = {
        configurada: true,
        instalacion_id: 'instalacion-e2e',
        servidor_central: 'https://central.e2e/api',
        estado: 'activa',
        mensaje: 'Licencia activa',
        version_actual: '2.15.0',
        version_objetivo: '2.16.0',
        actualizacion_disponible: true,
        notas_actualizacion: 'Mejoras PPPoE y mantenimiento',
        ultima_revision: '2026-09-12T10:00:00',
        plan_nombre: 'Mensual',
        plan_tipo: 'mensual',
        vigente_hasta: '2026-10-12T10:00:00',
        dias_gracia: 3,
        limite_clientes: 500,
        limite_routers: 5,
        uso_clientes: 20,
        uso_routers: 1,
      }
    } else if (url.pathname.endsWith('/configuracion/mantenimiento')) {
      body = {
        estado: 'completada',
        mensaje: 'Mantenimiento disponible',
        fecha: '2026-09-12T10:00:00',
        version: '2.15.0',
        respaldo: null,
        actualizacion_automatica: true,
        respaldo_automatico: true,
        revision_automatica: true,
        respaldo_externo_configurado: false,
        recuperacion_estado: 'verificada',
        recuperacion_fecha: '2026-09-12T10:00:00',
        clave_huella: null,
      }
    } else if (url.pathname.endsWith('/configuracion/respaldos')) {
      body = {
        politica: {
          activo: true,
          frecuencia_dias: 3,
          retencion_dias: 30,
          max_respaldos: 5,
          incluir_configuracion: true,
          incluir_archivos_estaticos: true,
          incluir_evidencias_ordenes: true,
          incluir_sesion_whatsapp: true,
          incluir_archivos_whatsapp: false,
          incluir_wireguard: true,
        },
        respaldos: [{
          archivo: '20260912-030000.tar.gz.gpg',
          creado_en: '2026-09-12T03:00:00',
          bytes: 1048576,
          checksum_disponible: true,
        }],
        proximo_respaldo: '2026-09-15T03:00:00',
        estado: { estado: 'respaldado', mensaje: 'Respaldo cifrado y verificado' },
      }
    } else if (url.pathname.endsWith('/configuracion/pppoe-default')) {
      body = {
        modo: 'aleatoria',
        password: null,
        longitud: 12,
        tipo_caracteres: 'alfanumerica',
      }
    } else if (url.pathname.endsWith('/configuracion/sistema')) {
      body = {
        id: 1,
        activar_corte_automatico: true,
        activar_notificaciones: true,
        aviso_pantalla_corte: false,
        corte_solo_whatsapp: false,
        corte_whatsapp_kbps: 128,
        baja_automatica_dias: 90,
        dia_generacion_factura: 1,
        generar_facturas_automaticamente: true,
        hora_ejecucion_corte: '03:00',
        hora_generacion_facturas: '06:30',
        hora_recordatorios: '09:15',
        recordatorio_1_dias: 5,
        recordatorio_2_dias: 1,
        recordatorio_3_dias: 0,
        telefonos_alerta: '',
      }
    } else if (url.pathname.endsWith('/dashboard/home')) {
      body = {
        resumen_clientes: {
          total_clientes: 216,
          total_registrados: 216,
          contratos_activos: 204,
          contratos_suspendidos: 12,
          total_servicios_actuales: 216,
          pendientes_instalacion: 3,
          retirados: 0,
          online_activos: 204,
          offline_cortados: 12,
        },
        metricas: { total_clientes: 1, navegando_ok: 1, falla_tecnica: 0, morosos_online: 0, morosos_offline: 0 },
        finanzas: { cobrado_hoy: 0, cobrado_mes: 0, clientes_cobrados_hoy: 0, clientes_cobrados_mes: 0, moneda: 'MXN' },
        facturacion: { total: 216, pagadas: 204, pendientes: 12, porcentaje: 94.4 },
        ultimos_pagos: [],
        servidor: { cpu_percent: 5, ram_total_gb: 8, ram_usada_percent: 20, disco_libre_percent: 80 },
      }
    } else if (url.pathname.endsWith('/dashboard/clientes-online-detalle')) {
      body = {
        metricas: {
          total_clientes: 216,
          total_clientes_directorio: 216,
          total_servicios: 216,
          clientes_online_mikrotik: 208,
          clientes_offline_mikrotik: 8,
          total_suspendidos: 12,
          navegando_ok: 200,
          falla_tecnica: 4,
          morosos_online: 4,
          morosos_offline: 0,
        },
      }
    } else if (url.pathname.endsWith('/dashboard/status-tabla-clientes')) {
      body = { detalle_clientes: { '1': { color: 'green', diagnostico_sistema: 'ONLINE', estado_tecnico: 'ONLINE' } } }
    } else if (url.pathname.includes('/finanzas/listado-completo')) {
      const resumen = {
        pagadas_cant: 0,
        pagadas_total: 0,
        pendientes_cant: url.searchParams.has('cliente_id') ? 0 : 1,
        pendientes_total: url.searchParams.has('cliente_id') ? 0 : 500,
        vencidas_cant: 0,
        vencidas_total: 0,
        anuladas_cant: 0,
        anuladas_total: 0,
      }
      body = url.searchParams.has('cliente_id')
        ? { items: [], resumen }
        : {
            items: [{
              id: 42,
              cliente_id: 1,
              estado: 'pendiente',
              saldo_pendiente: 500,
              total: 500,
              fecha_vencimiento: '2099-12-31',
              fecha_promesa_pago: null,
              es_promesa_activa: false,
              plan_snapshot: 'Plan E2E',
              cliente: { id: 1, nombre: 'Factura E2E', ip_asignada: '10.0.0.2' },
            }],
            resumen,
          }
    } else if (url.pathname.endsWith('/finanzas/pagos-reporte')) {
      body = { detalles: [{
        id: 7,
        cliente_id: 1,
        cliente_nombre: 'Cliente equivocado E2E',
        cliente_cedula: 'ERR-1',
        factura_id: 41,
        metodo: 'efectivo',
        referencia: null,
        fecha: '2026-09-12T10:00:00',
        usuario_nombre: 'Cobradora E2E',
        monto: 500,
        zona_nombre: 'Zona E2E',
        router_nombre: 'Router E2E',
      }] }
    } else if (url.pathname.endsWith('/finanzas/caja/actual')) {
      body = { abierta: false, caja: null }
    } else if (url.pathname.endsWith('/clientes/E2E-1/portal')) {
      body = {
        id: 1,
        nombre: 'Instalación E2E',
        cedula: 'E2E-1',
        ip_asignada: '10.0.0.2',
        olt_id: 1,
        onu_id: 1,
        caja_nap_id: null,
        puerto_nap: null,
        plan_id: 1,
        router_id: 1,
        identificador_onu: 'ONU-E2E',
        olt_nombre: 'OLT E2E',
        suggested_user: 'cliente_e2e',
        suggested_pass: 'clave-e2e',
        plan_nombre: 'Plan E2E',
      }
    } else if (url.pathname.endsWith('/clientes/TECH-1/portal')) {
      body = {
        id: 1,
        nombre: 'Cliente Técnico E2E',
        cedula: 'TECH-1',
        telefono: '5550000000',
        direccion: 'Dirección técnica E2E',
        estado: 'activo',
        ip_asignada: '10.0.0.2',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        is_online: true,
        nap_nombre: 'NAP E2E',
        puerto_nap: 3,
        router_nombre: 'Router E2E',
        plan_nombre: 'Plan E2E',
        precio_plan: 500,
        velocidad_bajada: 102400,
        velocidad_subida: 51200,
        fecha_corte: '2026-07-31',
        total_deuda: 0,
        facturas_pendientes: 0,
        suggested_user: 'cliente_e2e',
        suggested_pass: 'clave-e2e',
        identificador_onu: 'ONU-E2E',
        olt_nombre: 'OLT E2E',
        potencia_optica: '-22.50 dBm',
      }
    } else if (url.pathname.endsWith('/clientes/listado-completo-unificado')) {
      body = [{
        id: 1,
        nombre: 'Cliente E2E',
        cedula: 'E2E-1',
        telefono: '5550000000',
        direccion: 'Dirección E2E',
        latitud: 19.4326,
        longitud: -99.1332,
        zona: 'Centro',
        servicio: {
          plan_nombre: 'Plan E2E',
          precio_plan: 500,
          ip_asignada: '10.0.0.2',
          router_nombre: 'Router E2E',
          estado_servicio: 'activo',
        },
        finanzas: { facturas_pendientes_cant: 0, total_deuda: 0, saldo_a_favor: 0, estado_financiero: 'al_dia' },
      }]
    } else if (url.pathname.endsWith('/clientes/1')) {
      body = {
        id: 1,
        nombre: 'Cliente E2E',
        telefono: '5550000000',
        direccion: 'Dirección E2E',
        latitud: 19.4326,
        longitud: -99.1332,
        ip_asignada: '10.0.0.2',
        estado: 'activo',
      }
    } else if (url.pathname.endsWith('/servicios/cliente/1')) {
      body = [{
        id: 1,
        cliente_id: 1,
        alias: 'Casa',
        direccion: 'Dirección E2E',
        ip_asignada: '10.0.0.2',
        is_online: true,
        estado: 'activo',
        tipo_facturacion: 'prepago',
        ciclo_facturacion: 'calendario',
        meses_gratis: 0,
        created_at: '2026-07-01T00:00:00Z',
      }]
    } else if (url.pathname.endsWith('/clientes/buscar')) {
      body = [{
        id: 1,
        nombre: 'Cliente Global E2E',
        telefono: '5550000000',
        estado: 'activo',
        total_deuda: 0,
      }]
    } else if (url.pathname.endsWith('/clientes/')) {
      body = [{
        id: 1,
        nombre: 'Cliente E2E',
        cedula: 'E2E-1',
        ip_asignada: '10.0.0.2',
        estado: 'activo',
        zona: { nombre: 'Centro' },
      }]
    } else if (url.pathname.endsWith('/zonas/')) {
      body = []
    } else if (url.pathname.endsWith('/infraestructura/naps')) {
      body = []
    } else if (url.pathname.endsWith('/planes/')) {
      body = []
    } else if (url.pathname.endsWith('/network/redes/')) {
      body = []
    } else if (url.pathname.endsWith('/network/routers/')) {
      body = [{
        id: 1,
        nombre: 'Router E2E',
        ip_vpn: '10.0.0.1',
        user_api: 'admin',
        port_api: 8728,
        tipo_seguridad: 'pppoe',
        tipo_control: 'colas_dinamicas',
        version_os: 'v7',
        is_active: true,
        created_at: '2026-07-28T00:00:00Z',
      }]
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

