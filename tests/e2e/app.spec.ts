import { expect, test, type Page } from '@playwright/test'

async function authenticateAs(
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

async function mockApi(page: Page) {
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

test('muestra el acceso principal sin errores de renderizado', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByText('Portal de Administración')).toBeVisible()
  await expect(page.getByPlaceholder('admin')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible()
})

test('avisa cuando el dispositivo pierde conexión', async ({ page, context }) => {
  await page.goto('/login')
  await context.setOffline(true)

  await expect(page.getByText('Trabajando sin conexión')).toBeVisible()
})

test('carga una ruta administrativa diferida con API simulada', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/bajas')

  // Bajas ahora vive en la pestaña Retiros del inventario.
  await expect(page).toHaveURL(/\/admin\/inventario\?tab=retiros$/)
  await expect(page.getByRole('heading', { name: 'Inventario / Bodega' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Retiros' })).toHaveAttribute('aria-selected', 'true')
})

test('ofrece recuperación cuando falla un módulo diferido', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/assets/Inventario-*.js', (route) => route.abort())
  await page.goto('/admin/inventario')

  await expect(page.getByRole('heading', { name: 'No pudimos cargar esta pantalla' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Limpiar versión y recargar' })).toBeVisible()
})

test('carga el panel técnico tipado', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/dashboard')

  await expect(page.getByText('FdezNet Tech')).toBeVisible()
  await expect(page.getByLabel('Buscar cliente')).toBeVisible()
})

test('el radar OLT no escanea hasta elegir la OLT', async ({ page }) => {
  const escaneos: string[] = []
  page.on('request', (request) => {
    if (/\/olts\/\d+\/monitoreo/.test(request.url())) escaneos.push(request.url())
  })
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/radar')

  await expect(page.getByRole('heading', { name: 'Radar OLT / Fibra' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué OLT quieres escanear?' })).toBeVisible()
  await expect(page.getByText('OLT Paraíso')).toBeVisible()
  expect(escaneos).toHaveLength(0)

  await page.getByRole('button', { name: 'Escanear OLT Centro' }).click()
  await expect(page.getByText('Escaneando', { exact: true })).toBeVisible()
  await expect(page.locator('.olt-empty:visible')).toHaveText('Sin resultados.')
  expect(escaneos).toHaveLength(1)
  expect(escaneos[0]).toContain('/olts/1/monitoreo')

  await page.getByRole('button', { name: 'Cambiar OLT' }).click()
  await expect(page.getByRole('heading', { name: '¿Qué OLT quieres escanear?' })).toBeVisible()
  expect(escaneos).toHaveLength(1)
})

test('el radar muestra la causa de la caída, el diagnóstico y reinicia la ONU', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/radar')
  await page.getByRole('button', { name: 'Escanear OLT Paraíso' }).click()

  // La ONU caída avisa que es problema de fibra, no de luz.
  await expect(page.locator('.olt-pill:visible', { hasText: '✂ Posible falla de fibra' }).first()).toBeVisible()

  await page.locator('button:visible', { hasText: 'Ver datos' }).first().click()
  await expect(page.getByText('Distancia a la OLT')).toBeVisible()
  await expect(page.getByText('1.44 km')).toBeVisible()
  await expect(page.getByText('24 h 43 min').or(page.getByText('1 d 0 h'))).toBeVisible()
  await expect(page.getByText('Última caída:')).toBeVisible()

  const reinicio = page.waitForRequest((request) => (
    request.url().includes('/olts/2/onus/1/3/reiniciar') && request.method() === 'POST'
  ))
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: '⟳ Reiniciar ONU' }).click()
  const peticion = await reinicio
  expect(peticion.postDataJSON()).toEqual({ serial: 'HWTC0000AAAA' })
  await expect(page.getByText('La ONU se está reiniciando')).toBeVisible()
})

test('carga el panel principal con sus contratos tipados', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible()
  await expect(page.getByText('Resumen de Red')).toBeVisible()
  await expect(page.getByText('Clientes actuales')).toBeVisible()
  await expect(page.getByText('Servicios Offline / sin sesión')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Terminal de Cobro' })).toHaveCount(0)
})

test('muestra errores y reintentos en la bandeja de WhatsApp', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/whatsapp/salidas')

  await expect(page.getByRole('heading', { name: 'Bandeja de WhatsApp' })).toBeVisible()
  await expect(page.getByText('WhatsApp desconectado', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true }).first()).toBeVisible()
})

test('abre herramientas y alta desde el listado unificado', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/clientes')

  await expect(page.getByText('Gestión de Clientes')).toBeVisible()
  if ((page.viewportSize()?.width ?? 1024) < 640) {
    await expect(page.locator('.app-bottom-nav')).toHaveCount(0)
    await page.getByRole('button', { name: 'Filtrar clientes' }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros de clientes' })).toBeVisible()
    await page.getByRole('button', { name: 'Listo' }).click()
    await expect(page.getByRole('link', { name: 'Llamar a Cliente E2E' })).toHaveAttribute('href', 'tel:5550000000')
    await expect(page.getByRole('link', { name: 'Abrir ubicación de Cliente E2E' })).toHaveAttribute('href', /^geo:19\.4326,-99\.1332/)
    await page.locator('article').first().click()
    await expect(page.locator('.client-detail-panel')).toBeVisible()
    await expect(page.getByText('Copiar IP')).toHaveCount(0)
    await expect(page.getByTitle('Copiar IP asignada')).toBeVisible()
    await page.locator('.client-close-button').click()
  }
  await page.getByRole('button', { name: 'Herramientas de Cliente E2E' }).click()
  const toolsDialog = page.getByRole('dialog', { name: 'Herramientas del cliente' })
  await expect(toolsDialog.getByText('10.0.0.2', { exact: true })).toBeVisible()
  await expect(toolsDialog.getByText('Activo', { exact: true })).toBeVisible()
  // El admin ya no chatea desde aquí: contesta desde el celular.
  await expect(toolsDialog.getByRole('button', { name: /^Mensaje/ })).toHaveCount(0)
  await toolsDialog.getByRole('button', { name: 'Cerrar herramientas' }).click()
  await page.getByRole('button', { name: 'Nuevo Cliente' }).click()
  await expect(page.getByRole('heading', { name: 'Alta de Cliente' })).toBeVisible()
})

test('carga y conserva los horarios del sistema', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/sistema')

  await expect(page.getByRole('heading', { name: 'Sistema & Cronjobs' })).toBeVisible()
  await expect(page.locator('input[type="time"]').nth(1)).toHaveValue('06:30')
  await expect(page.locator('input[type="time"]').nth(2)).toHaveValue('09:15')
})

test('administra programación e historial de respaldos', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/respaldos')

  await expect(page.getByRole('heading', { name: 'Respaldos y recuperación' })).toBeVisible()
  await expect(page.getByText('20260912-030000.tar.gz.gpg')).toBeVisible()
  await expect(page.getByText('1.0 MB')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verificar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restaurar' })).toBeVisible()
  await expect(page.getByLabel('Respaldar cada cuántos días')).toHaveValue('3')
  await expect(page.getByLabel('Conservar respaldos durante (días)')).toHaveValue('30')
})

test('carga la importación masiva con catálogos vacíos', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/importar')

  await expect(page.getByRole('heading', { name: 'Importación Masiva' })).toBeVisible()
  await expect(page.getByText('Configuración del Lote')).toBeVisible()
  await expect(page.getByText('Seleccionar Excel')).toBeVisible()
})

test('carga el panel de cobranza con caja cerrada', async ({ page }) => {
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  await page.goto('/admin/cobranza')

  await expect(page.getByText('Recaudado Hoy')).toBeVisible()
  await expect(page.getByText('cajero-e2e')).toBeVisible()
})

test('impide que el técnico abra el panel administrativo', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/admin/clientes')

  await expect(page).toHaveURL(/\/tech\/dashboard$/)
  await expect(page.getByText('FdezNet Tech')).toBeVisible()
})

test('impide que el cajero abra las herramientas técnicas', async ({ page }) => {
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  await page.goto('/tech/dashboard')

  await expect(page).toHaveURL(/\/admin\/cobranza$/)
  await expect(page.getByText('Recaudado Hoy')).toBeVisible()
})

test('si la red falla un momento al volver a la app, la lista se carga sin error', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  let fallos = 0
  // Como el celular al regresar de otra app: la primera consulta sale sin red.
  await page.route('**/api/clientes/listado-completo-unificado', async (route) => {
    if (fallos === 0) {
      fallos += 1
      return route.abort('internetdisconnected')
    }
    return route.fallback()
  })
  await page.goto('/admin/clientes')

  await expect(page.locator(':is(td, article):visible', { hasText: 'Cliente E2E' }).first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Error al cargar datos')).toHaveCount(0)
  expect(fallos).toBe(1)
})

test('el supervisor entra a clientes y en inventario solo ve los retiros', async ({ page }) => {
  await authenticateAs(page, 'supervisor')
  await mockApi(page)
  await page.goto('/admin/clientes')

  await expect(page).toHaveURL(/\/admin\/clientes$/)
  await expect(page.getByText('Gestión de Clientes')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Terminal de Cobro' })).toHaveCount(0)
  if ((page.viewportSize()?.width ?? 1024) < 768) {
    await page.locator('header button').first().click()
  }
  await page.getByRole('button', { name: 'Operaciones' }).click()
  await expect(page.getByText('Órdenes / Instalaciones')).toBeVisible()
  await expect(page.getByText('Bajas / Recuperación')).toHaveCount(0)
  await page.getByRole('link', { name: 'Inventario / Bodega' }).click()

  await expect(page.getByRole('heading', { name: 'Inventario / Bodega' })).toBeVisible()
  await expect(page.getByText('No hay retiros en este estado.')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Equipos' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ingresar equipo' })).toHaveCount(0)
})

test('el admin recibe en bodega una ONU de una baja indicando cómo llegó', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/bajas/tecnicos/disponibles', (route) =>
    route.fulfill({ json: [{ id: 7, nombre_completo: 'Técnico Uno', usuario: 'tec1', rol: 'tecnico', activo: true }] }))
  await page.route('**/api/bajas/', (route) => route.fulfill({ json: [{
    id: 12, cliente_id: 5, servicio_id: 9, estado: 'pendiente_retiro', motivo: 'Se cambia de casa',
    cliente: { nombre: 'Rosa Pérez', direccion: 'Calle 2 #10', estado: 'baja' },
    onu: { id: 30, identificador: 'HWTC05450CB6', modelo: 'HG8145', estado: 'POR_RECOGER' },
    tecnico: null, mikrotik_estado: 'ok', solicitada_en: '2026-10-05T10:00:00',
  }] }))
  let recibido: unknown = null
  await page.route('**/api/bajas/12/confirmar-retiro', async (route) => {
    recibido = route.request().postDataJSON()
    await route.fulfill({ json: { id: 12 } })
  })
  await page.goto('/admin/inventario')
  await page.getByRole('tab', { name: 'Retiros' }).click()

  await expect(page.getByText('Rosa Pérez')).toBeVisible()
  await expect(page.getByText('HWTC05450CB6')).toBeVisible()
  // Sin indicar el estado del equipo no se recibe.
  await page.getByRole('button', { name: 'Recibir' }).click()
  await expect(page.getByText('Indica cómo llegó el equipo')).toBeVisible()
  expect(recibido).toBeNull()
  await page.getByLabel('Cómo llegó el equipo de la baja 12').selectOption('danada')
  await page.getByRole('button', { name: 'Recibir' }).click()
  await expect.poll(() => recibido).toMatchObject({ condicion: 'danada' })
})

test('un error de validación al guardar un cliente se muestra sin romper la pantalla', async ({ page }, testInfo) => {
  // El manejo del error es el mismo; la lista móvil abre la ficha con otro gesto.
  test.skip(testInfo.project.name === 'mobile-chrome', 'la ficha se abre distinto en móvil')
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ detail: [{
        type: 'value_error', loc: ['body', 'mac_address'], msg: 'Value error, La MAC debe contener 12 dígitos hexadecimales',
        input: 'HWTCC099CCAC', ctx: {},
      }] }),
    })
  })
  await page.goto('/admin/clientes')
  await page.locator(':visible', { hasText: /^Cliente E2E$/ }).first().click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('button', { name: 'Guardar Datos' }).click()

  await expect(page.getByText('MAC: La MAC debe contener 12 dígitos hexadecimales')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar Datos' })).toBeVisible()
})

test('el técnico ve su siguiente contrato aunque no tenga internet', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  let sinInternet = false
  await page.route('**/api/contratos/apartados', (route) => sinInternet
    ? route.abort('internetdisconnected')
    : route.fulfill({ json: { apartados: [
      { codigo: 'A7F2', reservado_en: '2026-10-04T08:00:00', vence_en: '2026-11-03T08:00:00' },
      { codigo: 'C31B', reservado_en: '2026-10-04T08:00:00', vence_en: '2026-11-03T08:00:00' },
    ] } }))
  await page.goto('/tech/dashboard')
  await expect(page.getByText('A7F2')).toBeVisible()
  await expect(page.getByText('C31B')).toBeVisible()

  // En la caja NAP, sin señal: el contrato sigue ahí, guardado en el celular.
  // (La app ya está cargada; solo el servidor no responde.)
  sinInternet = true
  await page.reload()
  await expect(page.getByText('A7F2')).toBeVisible()
  await expect(page.getByText('Sin internet: estos son los que tienes guardados en tu celular.')).toBeVisible({ timeout: 15000 })
})

test('al reabrir la app sin internet el técnico entra directo a su panel', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/dashboard')
  await expect(page.getByText('FdezNet Tech')).toBeVisible()

  // Cerró la app con wifi y datos apagados; al abrirla entra por "/".
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/tech\/dashboard/)
  await expect(page.getByText('FdezNet Tech')).toBeVisible()
  await expect(page.getByLabel('Buscar cliente')).toBeVisible()
})

test('el técnico activa la solicitud y ve contrato, PPPoE y cómo se le cobra', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 17.1, longitude: -93.2 })
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route('**/api/contratos/apartados', (route) => route.fulfill({ json: { apartados: [{ codigo: 'A7F2', reservado_en: '2026-10-04T08:00:00', vence_en: '2026-11-03T08:00:00' }] } }))
  await page.route('**/api/ordenes/41/activacion**', (route) => route.fulfill({ json: {
    solicitud: { id: 41, version: 2, nombre: 'Ana Lopez', telefono: '5550001111', direccion: 'Calle 1 #20', zona_id: 2, plan_id: 11, cliente_id: null },
    zonas: [{ id: 2, nombre: 'Paraíso', plantilla_id: 2 }],
    zona_id: 2,
    infraestructura: {
      router: { id: 3, nombre: 'MikroTik Paraíso', modo: 'pppoe' },
      olt: { id: 2, nombre: 'OLT Paraíso' },
      red: { id: 5, nombre: 'Clientes', cidr: '10.10.9.0/24' },
      planes: [{ id: 11, nombre: 'Plan 300', precio: 300 }, { id: 12, nombre: 'Plan 400', precio: 400 }],
      naps: [{ id: 8, nombre: 'NAP-03', capacidad: 8 }],
      plantilla_id: 2,
    },
    plantillas: [{ id: 1, nombre: 'Día 1' }, { id: 2, nombre: 'Día 15' }],
    onus: [{ id: 4, identificador: 'ZTEG00000001', modelo: 'F660' }],
    usuario_pppoe: 'Ana_Lopez',
  } }))
  let enviado: Record<string, unknown> | null = null
  await page.route('**/api/ordenes/41/activar', async (route) => {
    enviado = route.request().postDataJSON()
    await route.fulfill({ json: {
      contrato: 'A7F2', nombre: 'Ana Lopez', plan: 'Plan 400', modo: 'pppoe', usuario_pppoe: 'Ana_Lopez',
      password_pppoe: 'clave123', ip: '10.10.9.60', onu: 'ZTEG00000001',
      senal: { potencia: '-19.50 dBm', estado: 'online', recomendacion: '¡Señal EXCELENTE!' },
      cambios: ['plan Plan 300 → Plan 400'],
      meses_gratis: 1,
      cobro: {
        activacion: '2026-10-05',
        gratis_hasta: '2026-11-04',
        mensualidad_desde: '2026-11-15',
        mensualidad_hasta: '2026-12-14',
        corte: '2026-11-25',
        mensualidad: 400,
        prorrateo: { total: 129.03, desde: '2026-11-05', hasta: '2026-11-14', dias: 10 },
        primer_pago: { fecha: '2026-11-15', total: 529.03 },
        explicacion: [
          'Tiene 1 mes gratis: del 5 de octubre al 4 de noviembre no paga nada.',
          'El 15 de noviembre paga $529.03 en un solo recibo: el prorrateo ($129.03) más su primera mensualidad ($400.00), que cubre del 15 de noviembre al 14 de diciembre.',
        ],
      },
    } })
  })
  await page.goto('/tech/activar/41')

  await expect(page.getByLabel('Nombre del titular')).toHaveValue('Ana Lopez')
  await expect(page.getByLabel('Contrato escrito en el conector')).toHaveValue('A7F2')
  await page.getByRole('combobox', { name: 'Plan', exact: true }).selectOption('12')
  await expect(page.getByRole('combobox', { name: 'Contrato escrito en el conector' }).locator('option')).toHaveText(['A7F2 · siguiente', 'Que el sistema genere uno', 'Escribir otro contrato apartado'])
  await page.getByLabel('ONU instalada', { exact: true }).fill('zteg')
  await page.getByRole('option', { name: /ZTEG00000001/ }).click()
  await expect(page.getByText('ZTEG00000001 · F660')).toBeVisible()
  await page.getByRole('combobox', { name: 'Caja NAP', exact: true }).selectOption('8')
  await page.getByRole('combobox', { name: 'Puerto', exact: true }).selectOption('3')
  await page.getByRole('button', { name: 'Capturar ubicación GPS' }).click()
  await expect(page.getByRole('button', { name: 'Ubicación capturada' })).toBeVisible()
  await page.getByRole('button', { name: 'Activar cliente' }).click()

  await expect(page.getByText('Servicio activo y orden cerrada')).toBeVisible()
  await expect(page.getByText('clave123')).toBeVisible()
  await expect(page.getByText('Calendario de cobro')).toBeVisible()
  await expect(page.getByText('Explicación para el cliente')).toBeVisible()
  await expect(page.getByText('Tiene 1 mes gratis: del 5 de octubre al 4 de noviembre no paga nada.')).toBeVisible()
  await expect(page.getByText('$529.03').first()).toBeVisible()
  await expect(page.getByTitle('Día de pago')).toHaveText('15')
  await expect(page.getByText('Corte si no paga').first()).toBeVisible()
  // Al técnico solo le sirven los datos de conexión: la señal y los cambios ya no se muestran.
  await expect(page.getByText('-19.50 dBm')).toHaveCount(0)
  await expect(page.getByText('plan Plan 300 → Plan 400')).toHaveCount(0)
  expect(enviado).toMatchObject({ version: 2, zona_id: 2, plan_id: 12, plantilla_id: 2, contrato_apartado: 'A7F2', onu_id: 4, caja_nap_id: 8, puerto_nap: 3, meses_gratis: 1 })
})

test('carga una instalación técnica preasignada', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/instalar/E2E-1')

  await expect(page.getByText('Instalación E2E')).toBeVisible()
  await expect(page.getByText('OLT E2E')).toBeVisible()
  await expect(page.getByText('ONU-E2E')).toBeVisible()
})

test('abre la terminal de cobro y busca un cliente', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  await page.getByRole('button', { name: 'Cobrar' }).click()
  await expect(page.getByRole('heading', { name: 'Registrar Pago' })).toBeVisible()
  await page.getByPlaceholder('Nombre, número de contrato de 4 dígitos o IP...').fill('Cliente')
  await expect(page.getByText('Cliente E2E', { exact: true })).toBeVisible()
})

test('carga el inventario con un equipo disponible', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/inventario')

  await expect(page.getByRole('heading', { name: 'Inventario / Bodega' })).toBeVisible()
  await expect(page.locator('span:visible').filter({ hasText: /^ONU-STOCK-E2E$/ }).first()).toBeVisible()
  await expect(page.locator('span:visible').filter({ hasText: /^BODEGA$/ }).first()).toBeVisible()
  await expect(page.getByText('Quedan 1 ONU en bodega (mínimo 5).', { exact: false })).toBeVisible()
})

test('el admin cambia el mínimo de ONU en bodega', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  let enviado: unknown = null
  await page.route('**/api/inventario/stock', async (route) => {
    if (route.request().method() === 'PUT') {
      enviado = route.request().postDataJSON()
      await route.fulfill({ json: { disponibles: 1, minimo: 0, bajo: false } })
    } else {
      await route.fulfill({ json: { disponibles: 1, minimo: 5, bajo: true } })
    }
  })
  await page.goto('/admin/inventario')

  await page.getByRole('button', { name: 'Cambiar mínimo' }).click()
  await page.getByLabel('Mínimo de ONU en bodega').fill('0')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect.poll(() => enviado).toEqual({ minimo: 0 })
  await expect(page.getByText('1 ONU en bodega · aviso apagado')).toBeVisible()
})

test('carga el detalle técnico completo de un cliente', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/cliente/TECH-1')

  await expect(page.getByText('Cliente Técnico E2E')).toBeVisible()
  await expect(page.getByText('NAP E2E')).toBeVisible()
  await expect(page.getByText('-22.50 dBm')).toBeVisible()
  // Cliente asignado: puede llamarle y escribirle.
  await expect(page.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:5550000000')
  await expect(page.getByRole('button', { name: 'WhatsApp al cliente' })).toBeVisible()
})

test('el técnico busca por contrato con el botón y ve la ficha técnica de un cliente que no es suyo', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  let buscado = ''
  await page.route(/\/api\/clientes\/\?search=/, async (route) => {
    buscado = new URL(route.request().url()).searchParams.get('search') || ''
    await route.fulfill({ json: [{ id: 50, nombre: 'Cliente Ajeno', cedula: 'AJ01', direccion: 'Calle 9', estado: 'activo' }] })
  })
  await page.route('**/api/clientes/AJ01/portal', (route) => route.fulfill({ json: {
    id: 50, nombre: 'Cliente Ajeno', cedula: 'AJ01', telefono: '5551112222', direccion: 'Calle 9', estado: 'activo',
    ip_asignada: '10.0.0.9', is_online: true, nap_nombre: 'P1-SJ-1-A', puerto_nap: 2, router_nombre: 'Router E2E',
    plan_nombre: 'Plan E2E', precio_plan: 300, velocidad_bajada: 10240, velocidad_subida: 5120,
    es_cliente_asignado: false, puede_reiniciar_onu: true, total_deuda: 300, facturas_pendientes: 1, fecha_corte: '2026-09-25', saldo_a_favor: 0, latitud: 16.39586, longitud: -92.69331,
    cuenta: {
      estado_servicio: 'suspendido',
      explicacion: 'Suspendido desde el 01/10/2026 por adeudo de $300 (Mensualidad Octubre, venció el 25/09/2026). Se reactiva al pagar o con una promesa de pago.',
      adeudos: [{ concepto: 'Mensualidad Octubre', monto: 300, vence: '25/09/2026', vencido: true }],
      ultimo_pago: { fecha: '24/08/2026', monto: 300, metodo: 'transferencia' }, promesa: null, suspendido_desde: '01/10/2026',
    },
    suggested_user: 'Cliente_Ajeno', suggested_pass: 'x', identificador_onu: 'HWTC00000009', olt_nombre: 'OLT E2E',
  } }))
  await page.route('**/api/network/diagnostico/conexion/50', (route) => route.fulfill({ json: { online: true, metodo: 'PPPoE', datos: { uptime: '2h15m', ip_actual: '10.0.0.9' } } }))
  await page.route('**/api/network/diagnostico/trafico/50', (route) => route.fulfill({ json: { velocidad_bajada: 12_000_000, velocidad_subida: 1_500_000 } }))
  await page.goto('/tech/buscar')

  await expect(page.getByRole('button', { name: /QR/i })).toHaveCount(0)
  await page.getByLabel('Buscar cliente').fill('AJ01')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect.poll(() => buscado).toBe('AJ01')
  await page.getByText('Cliente Ajeno').click()

  await expect(page.getByText('P1-SJ-1-A')).toBeVisible()
  // El estado de cuenta sí se ve, para explicar en campo por qué lo suspendieron.
  await expect(page.getByText(/Suspendido desde el 01\/10\/2026 por adeudo de \$300/)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Lo que debe' }).getByText('Mensualidad Octubre')).toBeVisible()
  await expect(page.getByText('$300 · 24/08/2026')).toBeVisible()
  await expect(page.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', /destination=16\.39586%2C-92\.69331/)
  // Sesión PPPoE y consumo: sirve aunque el cliente no tenga ONU (radio enlace).
  await expect(page.getByText('Conectado hace 2h15m · IP 10.0.0.9')).toBeVisible()
  await expect(page.getByText('12 Mbps')).toBeVisible()
  await expect(page.getByText('1.5 Mbps')).toBeVisible()

  // Reinicio de la ONU desde la ficha.
  let reiniciada = false
  await page.route('**/api/clientes/50/reiniciar-onu', async (route) => { reiniciada = true; await route.fulfill({ json: { status: 'success' } }) })
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Reiniciar ONU' }).click()
  await expect.poll(() => reiniciada).toBe(true)
  await expect(page.getByText('La ONU se está reiniciando')).toBeVisible()
  // Desde la búsqueda la ficha es solo técnica: sin chat ni llamada a un cliente que no es suyo.
  await expect(page.getByRole('link', { name: /Llamar/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'WhatsApp al cliente' })).toHaveCount(0)
})

test('desde su agenda el técnico escribe al prospecto y abre la ruta de su ubicación', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [{
    id: 41, tipo: 'instalacion', estado: 'asignada', version: 1, prospecto_nombre: 'Ana Lopez', prospecto_telefono: '5550001111',
    prospecto_direccion: 'Casa azul · https://maps.google.com/?q=16.7521,-93.1152', fecha_programada: null,
  }] }))
  const pedidas: string[] = []
  await page.route('**/api/ordenes/41/chat', (route) => { pedidas.push('chat'); return route.fulfill({ json: [] }) })
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  await expect(page.getByRole('link', { name: 'Cómo llegar con Ana Lopez' }).first()).toHaveAttribute('href', /destination=16\.7521%2C-93\.1152/)
  await page.getByRole('button', { name: 'WhatsApp a Ana Lopez' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Chat con Ana Lopez' })).toBeVisible()
  await expect.poll(() => pedidas.length).toBeGreaterThan(0)
})

test('la instalación pasa de en camino a activar y el retiro solo pide el equipo recogido', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [
    { id: 41, tipo: 'instalacion', estado: 'asignada', version: 1, prospecto_nombre: 'Ana Lopez', prospecto_direccion: 'Calle Uno 123', fecha_programada: null },
    { id: 42, tipo: 'instalacion', estado: 'en_camino', version: 2, prospecto_nombre: 'Beto Ruiz', prospecto_direccion: 'Calle Dos 456', fecha_programada: null },
    { id: 43, tipo: 'retiro', estado: 'asignada', version: 1, cliente_id: 9, cliente: { id: 9, nombre: 'Carla Diaz', direccion: 'Calle Tres 789', telefono: '5550002222' }, fecha_programada: null },
  ] }))
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  const ana = page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: 'Ana Lopez' }) }).last()
  await expect(ana.getByRole('button', { name: 'Marcar en camino' })).toBeVisible()
  await expect(ana.getByRole('button', { name: 'Activar cliente' })).toHaveCount(0)
  const beto = page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: 'Beto Ruiz' }) }).last()
  await expect(beto.getByRole('button', { name: 'Activar cliente' })).toBeVisible()
  await expect(beto.getByRole('button', { name: /Marcar en camino|Iniciar trabajo/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Retiros', exact: true }).click()
  const carla = page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: 'Carla Diaz' }) }).last()
  await expect(carla.getByRole('button', { name: 'WhatsApp a Carla Diaz' })).toBeVisible()
  await expect(carla.getByRole('link', { name: 'Cómo llegar con Carla Diaz' })).toBeVisible()
  await expect(carla.getByRole('button', { name: /Equipo recogido/ })).toBeVisible()
  await expect(carla.getByRole('button', { name: /Marcar en camino|Iniciar trabajo/ })).toHaveCount(0)
})

test('busca un cliente desde el encabezado global', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  if ((page.viewportSize()?.width ?? 1024) < 640) {
    await page.getByRole('button', { name: 'Buscar cliente' }).click()
    await page.getByRole('searchbox', { name: 'Buscar cliente por nombre...' }).fill('Cliente')
    await expect(page.getByRole('button', { name: /Cliente Global E2E/ })).toBeVisible()
  } else {
    await page.getByPlaceholder('Buscar cliente por nombre...').fill('Cliente')
    await expect(page.getByText('Cliente Global E2E')).toBeVisible()
  }
})

test('carga facturas y su resumen financiero', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/facturas')

  await expect(page.getByRole('heading', { name: 'Gestión Financiera' })).toBeVisible()
  await expect(page.locator(':is(div, h3):visible').filter({ hasText: /^Factura E2E$/ }).first()).toBeVisible()
  await expect(page.getByText('Pendiente (1)')).toBeVisible()
})

test('descarga el PDF de una factura y hace la emisión masiva', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/finanzas/facturas/42/pdf', (route) => route.fulfill({
    status: 200, contentType: 'application/pdf', body: '%PDF-1.4 prueba',
  }))
  await page.route('**/api/finanzas/generar-masivo', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ mensaje: 'ok', detalles: { facturas_generadas: 3 } }),
  }))
  await page.goto('/admin/facturas')

  const descarga = page.waitForEvent('download')
  await page.locator('button:visible', { hasText: 'PDF' }).or(page.getByRole('button', { name: 'Descargar PDF de la factura 42' })).first().click()
  expect((await descarga).suggestedFilename()).toBe('factura-000042.pdf')

  page.once('dialog', (dialog) => void dialog.accept())
  const emision = page.waitForRequest((request) => request.url().includes('/finanzas/generar-masivo') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Emisión Masiva' }).click()
  await emision
  await expect(page.getByText('3 facturas emitidas')).toBeVisible()
})

test('busca facturas por nombre o contrato en todas las fechas', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/facturas')

  const peticion = page.waitForRequest((request) => (
    request.url().includes('/finanzas/listado-completo')
    && new URL(request.url()).searchParams.get('busqueda') === 'BD0F'
  ))
  await page.getByRole('searchbox', { name: 'Buscar factura por nombre, contrato o folio' }).fill('BD0F')
  await peticion
  await expect(page.getByText('Buscando «BD0F» en todas las fechas')).toBeVisible()
})

test('muestra la configuración activa del motor WhatsApp', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/whatsapp-qr')

  await expect(page.getByRole('heading', { name: 'Motor WhatsApp' })).toBeVisible()
  await expect(page.getByText('Motor Desactivado')).toBeVisible()
  await expect(page.getByText('Modo Normal')).toBeVisible()
})

test('abre el formulario de un nuevo ciclo de cobro', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/plantillas-facturacion')

  await page.getByRole('button', { name: 'Nuevo Ciclo' }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo Ciclo' })).toBeVisible()
  await expect(page.getByPlaceholder('Ej: Pagos día 15...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar Ciclo' })).toBeVisible()
})

test('carga las órdenes desde su módulo administrativo', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/ordenes')

  await expect(page.getByRole('heading', { name: 'Instalaciones' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva Orden' })).toBeVisible()
})

test('nueva solicitud desde Instalaciones con zona y plan', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route(/\/api\/zonas\/?$/, (route) => route.fulfill({ json: [{ id: 5, nombre: 'Flores Magon', router_id: 4 }] }))
  await page.route(/\/api\/usuarios\/?$/, (route) => route.fulfill({ json: [{ id: 7, usuario: 'tec1', nombre_completo: 'Técnico Uno', rol: 'tecnico' }] }))
  await page.route('**/api/planes/router/4', (route) => route.fulfill({ json: [{ id: 9, nombre: 'Estándar', precio: 300 }] }))
  let creada: Record<string, unknown> | null = null
  await page.route(/\/api\/ordenes\/$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    creada = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { id: 77 } })
  })
  const errores: string[] = []
  page.on('pageerror', (error) => errores.push(error.message))
  await page.goto('/admin/ordenes')

  await page.getByRole('button', { name: 'Nueva Orden' }).click()
  const ventana = page.getByRole('dialog')
  await ventana.getByPlaceholder('Ej: Juan Pérez').fill('Ana Lopez')
  await ventana.getByPlaceholder('55...').fill('9611234567')
  await ventana.locator('select').nth(0).selectOption('5')
  await ventana.locator('select').nth(1).selectOption('9')
  await ventana.getByPlaceholder('Calle, Número, Referencias...').fill('Calle 3, casa azul')
  await ventana.getByRole('button', { name: 'Crear Orden' }).click()

  await expect.poll(() => creada).toMatchObject({ tipo: 'instalacion', prospecto_nombre: 'Ana Lopez', zona_id: 5, plan_id: 9, tecnico_id: null })
  expect(errores).toEqual([])
  await expect(page.getByText('No pudimos cargar')).toHaveCount(0)
})

test('las instalaciones muestran zona, plan, origen y se filtran por técnico', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/zonas/', (route) => route.fulfill({ json: [{ id: 2, nombre: 'Paraíso' }] }))
  await page.route('**/api/planes/', (route) => route.fulfill({ json: [{ id: 11, nombre: 'Estándar', precio: 350 }] }))
  await page.route('**/api/ordenes/?tipo=instalacion', (route) => route.fulfill({ json: [
    { id: 41, version: 1, estado: 'pendiente', motivo: 'prospecto_whatsapp', created_at: new Date().toISOString(), zona_id: 2, plan_id: 11,
      prospecto_nombre: 'Ana Lopez', prospecto_telefono: '5550001111', prospecto_direccion: 'Calle 1 · https://maps.google.com/?q=16.7,-93.1', tecnico: null },
    { id: 42, version: 1, estado: 'asignada', created_at: new Date().toISOString(), prospecto_nombre: 'Luis Perez',
      prospecto_direccion: 'Calle 2', tecnico: { id: 7, nombre: 'Técnico Uno', usuario: 'tec1' } },
  ] }))
  await page.goto('/admin/ordenes')

  const ana = page.locator('article', { hasText: 'Ana Lopez' })
  await expect(ana.getByText('Paraíso')).toBeVisible()
  await expect(ana.getByText('Estándar · $350')).toBeVisible()
  await expect(ana.getByText('Agente IA')).toBeVisible()
  await expect(ana.getByRole('link', { name: 'Ver ubicación' })).toHaveAttribute('href', 'https://maps.google.com/?q=16.7,-93.1')
  await expect(page.locator('article', { hasText: 'Luis Perez' }).getByText('Sin zona')).toBeVisible()

  await page.getByRole('button', { name: /Sin técnico/ }).click()
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.locator('article', { hasText: 'Ana Lopez' })).toBeVisible()
})

test('el chat de un prospecto abre su conversación y no la de otro cliente', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  const pedidas: string[] = []
  page.on('request', (request) => { if (request.url().includes('/chat')) pedidas.push(new URL(request.url()).pathname) })
  await page.route('**/api/ordenes/chat/no-leidos', (route) => route.fulfill({ json: { 41: { count: 2 } } }))
  await page.route('**/api/ordenes/?tipo=instalacion', (route) => route.fulfill({ json: [
    { id: 41, version: 1, estado: 'pendiente', prospecto_nombre: 'Ana Lopez', prospecto_telefono: '5550001111', prospecto_direccion: 'Calle 1', tecnico: null },
  ] }))
  await page.route('**/api/ordenes/41/chat', (route) => route.fulfill({ json: [
    { id: 1, direccion: 'entrada', mensaje: 'Quiero contratar internet', fecha: '2026-10-04T09:00:00', ack: 0 },
  ] }))
  let enviado: unknown = null
  await page.route('**/api/ordenes/41/chat/enviar', async (route) => {
    enviado = route.request().postDataJSON()
    await route.fulfill({ json: { status: 'encolado' } })
  })
  await page.goto('/admin/ordenes')

  await page.locator('article', { hasText: 'Ana Lopez' }).getByRole('button', { name: '2 sin leer' }).click()
  await expect(page.getByText('Quiero contratar internet')).toBeVisible()
  await page.getByPlaceholder('Escribe un mensaje...').fill('Hola Ana, con gusto')
  await page.getByPlaceholder('Escribe un mensaje...').press('Enter')
  await expect.poll(() => enviado).toEqual({ mensaje: 'Hola Ana, con gusto' })
  expect(pedidas.some((ruta) => ruta.startsWith('/api/whatsapp/chat/'))).toBe(false)
})

test('el admin asigna técnico y fecha a una orden de instalación', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  const cambios: unknown[] = []
  await page.route('**/api/bajas/tecnicos/disponibles', (route) =>
    route.fulfill({ json: [{ id: 7, nombre_completo: 'Técnico Uno', usuario: 'tec1' }] }))
  await page.route('**/api/ordenes/?tipo=instalacion', (route) => route.fulfill({
    json: [{ id: 41, version: 1, estado: 'pendiente', prospecto_nombre: 'Prospecto Demo', prospecto_telefono: '5550000000', prospecto_direccion: 'Calle 1', tecnico: null, fecha_programada: null }],
  }))
  await page.route('**/api/ordenes/41', async (route) => {
    cambios.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: 41 } })
  })
  await page.route('**/api/ordenes/agenda?**', (route) => route.fulfill({ json: {
    fecha: '2026-10-05', laboral: true, horario: { inicio: '08:00', fin: '14:00' }, siguiente_libre: '10:30',
    bloques: [{ hora: '08:30', orden_id: 9, nombre: 'Cliente Ocupado' }, { hora: '10:30', orden_id: null, nombre: null }],
  } }))
  await page.goto('/admin/ordenes')

  await page.locator('select[aria-label="Técnico de Prospecto Demo"]:visible').selectOption('7')
  await expect.poll(() => cambios).toEqual([{ tecnico_id: 7 }])
  await page.getByRole('button', { name: 'Agendar visita de Prospecto Demo' }).click()
  const ventana = page.getByRole('dialog', { name: /Editar solicitud de Prospecto Demo/ })
  await ventana.getByLabel('Nombre').fill('Prospecto Demo Lopez')
  await ventana.getByLabel('Otro día').fill('2026-10-05')
  // El bloque de las 8:30 ya lo tiene otro cliente: se propone el siguiente libre.
  await expect(ventana.getByRole('radio', { name: /08:30 Cliente Ocupado/ })).toBeDisabled()
  await expect(ventana.getByRole('radio', { name: /10:30/ })).toHaveAttribute('aria-checked', 'true')
  await ventana.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(() => cambios.at(-1)).toMatchObject({
    prospecto_nombre: 'Prospecto Demo Lopez',
    prospecto_direccion: 'Calle 1',
    fecha_programada: '2026-10-05T10:30:00',
  })
})

test('carga las transacciones y sus filtros financieros', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/transacciones')

  await expect(page.getByRole('heading', { name: 'Corte de Cobranza' })).toBeVisible()
  await expect(page.getByText('Total en Pantalla')).toBeVisible()
  await expect(page.getByRole('button', { name: /Anular/ })).toBeVisible()
  await page.getByRole('button', { name: /Corregir/ }).click()
  await expect(page.getByRole('heading', { name: 'Corregir cobro #7' })).toBeVisible()
  await expect(page.getByText(/ERR-1.*Cliente equivocado E2E/)).toBeVisible()
})

test('carga las estadísticas de ingresos', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/estadisticas')

  await expect(page.getByRole('heading', { name: 'Resumen de Ingresos' })).toBeVisible()
  await expect(page.getByRole('combobox').first()).toBeVisible()
})

test('carga el mapa desde el módulo de monitoreo', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/mapa')

  await expect(page.getByText('Estado de Conexión')).toBeVisible()
  await expect(page.getByText('Monitoreo en Vivo (30s)')).toBeVisible()
})

test('carga la administración de usuarios y routers asignados', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/usuarios')

  await expect(page.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeVisible()
  await expect(page.getByText('Routers Permitidos')).toBeVisible()
})

function campo(page: Page, etiqueta: string) {
  // Selector que sigue a su etiqueta (directo o dentro de su contenedor).
  return page.locator(`xpath=//label[normalize-space()="${etiqueta}"]/following-sibling::*[1][self::select or self::div]/descendant-or-self::select[1]`).first()
}

async function mockInfraestructuraZona(page: Page) {
  await page.route('**/api/zonas/', (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: [{ id: 3, nombre: 'Vicente Guerrero', router_id: 1, olt_id: 2, plantilla_id: 1 }] })
    : route.fallback())
  await page.route('**/api/configuracion/plantillas-facturacion', (route) => route.fulfill({
    json: [{ id: 1, nombre: 'Pago día 1 / Corte día 11', dia_pago: 1 }, { id: 2, nombre: 'Pago día 15 / Corte día 25', dia_pago: 15 }],
  }))
  await page.route('**/api/network/redes/router/1', (route) => route.fulfill({ json: [{ id: 5, nombre: 'Red VG', cidr: '10.10.10.0/24' }] }))
  await page.route('**/api/planes/router/1', (route) => route.fulfill({ json: [{ id: 9, nombre: 'Plus', precio: 420 }] }))
  await page.route('**/api/network/redes/5/ips-libres', (route) => route.fulfill({ json: ['10.10.10.112', '10.10.10.113'] }))
  await page.route('**/api/configuracion/pppoe-default', (route) => route.fulfill({ json: { modo: 'fija', password: 'fdez1234' } }))
}

test('al elegir la zona se preseleccionan OLT, MikroTik, plantilla, red e IP', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'el formulario es el mismo en móvil')
  await authenticateAs(page)
  await mockApi(page)
  await mockInfraestructuraZona(page)
  await page.goto('/admin/clientes')
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()

  await page.getByPlaceholder('Nombre del cliente').fill('Cliente Zona')
  await page.getByPlaceholder('Número de contacto').fill('9611234567')
  await campo(page, 'Zona / Colonia').selectOption('3')
  await expect(campo(page, 'OLT Base')).toHaveValue('2')

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(campo(page, 'Plantilla de cobro')).toHaveValue('1')
  await expect(campo(page, 'Router')).toHaveValue('1')
  await expect(campo(page, 'Plan contratado').locator('option', { hasText: 'Plus' })).toHaveCount(1)

  await campo(page, 'Plan contratado').selectOption('9')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(campo(page, 'Red')).toHaveValue('5')
  await expect(campo(page, 'IP asignada')).toHaveValue('10.10.10.112')
})

test('la zona guarda su MikroTik, OLT y plantilla de cobro', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await mockInfraestructuraZona(page)
  let guardado: unknown = null
  await page.route('**/api/zonas/3', async (route) => {
    guardado = route.request().postDataJSON()
    await route.fulfill({ json: { id: 3, ...(guardado as object) } })
  })
  await page.goto('/admin/configuracion/zonas')

  await expect(page.getByText('Router E2E · OLT Paraíso')).toBeVisible()
  await expect(page.locator('p', { hasText: 'Pago día 1 / Corte día 11' })).toBeVisible()
  await page.getByTitle('Editar Zona').click()
  await page.getByLabel('Plantilla de cobro').selectOption('2')
  await page.getByRole('button', { name: 'Actualizar Cambios' }).click()
  await expect.poll(() => guardado).toEqual({ nombre: 'Vicente Guerrero', router_id: 1, olt_id: 2, plantilla_id: 2, colonias: null })
})

test('carga la administración de zonas', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/zonas')

  await expect(page.getByRole('heading', { name: 'Gestión de Zonas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear Zona' })).toBeVisible()
})

test('configura contraseñas PPPoE fijas o aleatorias', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/pppoe')

  await expect(page.getByRole('heading', { name: 'Seguridad PPPoE' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Una contraseña fija/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Contraseña aleatoria/ })).toBeVisible()
  await expect(page.getByRole('spinbutton')).toHaveValue('12')
  await expect(page.getByRole('combobox')).toHaveValue('alfanumerica')

  await page.getByRole('button', { name: /Una contraseña fija/ }).click()
  await expect(page.getByPlaceholder('Mínimo 3 caracteres')).toBeVisible()
})

test('permite iniciar una actualización disponible desde la licencia local', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/licencias')

  await expect(page.getByText('Actualización disponible: v2.16.0')).toBeVisible()
  const updateRequest = page.waitForRequest((request) =>
    request.method() === 'POST'
    && request.url().endsWith('/configuracion/mantenimiento/actualizar'))
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Actualizar ahora' }).click()
  await updateRequest
  await expect(page.getByRole('button', { name: 'Actualizando…' })).toBeDisabled()
})

test('carga las plantillas de mensajes de WhatsApp', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/mensajes')

  await expect(page.getByRole('heading', { name: 'Plantillas de WhatsApp' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear Plantilla', exact: true })).toBeVisible()
})

test('carga la infraestructura de túneles VPN', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/vpn')

  await expect(page.getByRole('heading', { name: 'Infraestructura VPN' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo Túnel' })).toBeVisible()
})

test('carga el historial de cronjobs', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/cron')

  await expect(page.getByRole('heading', { name: 'Historial de Cronjobs' })).toBeVisible()
  await expect(page.getByText('No hay registros de eventos.')).toBeVisible()
})

test('carga el inventario de cajas NAP', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/naps')

  await expect(page.getByRole('heading', { name: 'Cajas NAP (FTTH)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva NAP' })).toBeVisible()
})

test('carga la administración de planes de internet', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/planes')

  await expect(page.getByRole('heading', { name: 'Planes de Internet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo Plan' })).toBeVisible()
})

test('carga la administración de redes IP', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/redes')

  await expect(page.getByRole('heading', { name: /Gestión de Redes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva Red' })).toBeVisible()
})

test('carga y muestra los nodos MikroTik', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/routers')

  await expect(page.getByRole('heading', { name: 'Nodos MikroTik' })).toBeVisible()
  await expect(page.getByText('Router E2E')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vincular Nodo' })).toBeVisible()
})

test('permite configurar un nodo con DHCP estático y rate-limit', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/routers')

  await page.getByRole('button', { name: 'Vincular Nodo' }).click()
  await page.getByRole('combobox').selectOption('dhcp')

  await expect(page.getByRole('option', { name: 'DHCP estático (IP + MAC)' })).toBeAttached()
  await expect(page.getByText('Rate-limit en lease DHCP')).toBeVisible()
  await expect(page.getByText(/servidor DHCP debe existir/i)).toBeVisible()
})

test('inicia sesión con el contrato tipado y redirige al panel', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')

  await page.getByPlaceholder('admin').fill('admin-e2e')
  await page.getByPlaceholder('••••••••').fill('clave-e2e')
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()

  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible()
})

test('carga el portal público del cliente', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/portal/cliente/TECH-1')

  await expect(page.getByRole('heading', { name: 'SERVICIO ACTIVO' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cliente Técnico E2E' })).toBeVisible()
  await expect(page.getByText('10.0.0.2', { exact: true })).toBeVisible()
})

test('busca un abonado desde la herramienta técnica', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/buscar?q=Cliente')

  await expect(page.getByRole('heading', { name: 'Buscar Abonado' })).toBeVisible()
  await expect(page.getByText('Cliente E2E', { exact: true })).toBeVisible()
  await expect(page.getByText('Contrato: E2E-1')).toBeVisible()
})

test('abre la herramienta móvil de escaneo QR', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/scanner')

  await expect(page.getByRole('heading', { name: 'Buscar Cliente' })).toBeVisible()
  await expect(page.getByText('FdezNet Tech')).toBeVisible()
})

test('abre y guarda el formulario tipado de una OLT', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/radar')

  await page.getByRole('button', { name: '+ Nueva OLT' }).click()
  await expect(page.getByRole('heading', { name: /Nueva OLT/ })).toBeVisible()
  await page.getByPlaceholder('Ej: Villa de Guadalupe').fill('OLT E2E')
  await page.getByPlaceholder('Ej: 11.11.11.2').fill('10.0.0.10')
  await page.getByRole('button', { name: 'Guardar OLT' }).click()

  await expect(page.getByText('OLT guardada correctamente')).toBeVisible()
})

test.describe('escáner con cámara simulada', () => {
  test.use({ permissions: ['camera'] })

  test('el escáner de inventario lee el Code 128 de una ONU', async ({ page }) => {
    await authenticateAs(page)
    await mockApi(page)
    await page.goto('/admin/inventario')
    await expect(page.getByRole('heading', { name: 'Inventario / Bodega' })).toBeVisible()

    await page.getByRole('button', { name: 'Ingresar equipo' }).click()
    await page.getByText('Escanear Código (MAC/SN)').click()

    // Con la política de seguridad de producción (preview la replica), el lector
    // debe cargar desde nuestro dominio y leer la etiqueta de la cámara simulada.
    await expect(page.getByPlaceholder('Ej. HWTCB991C1AE')).toHaveValue('HWTC05450CB6', { timeout: 15_000 })
    await expect(page.getByText(/No se pudo abrir la cámara|cámara está ocupada/)).toHaveCount(0)
  })
})

test('el cobrador arma su ruta con los morosos más cercanos', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 16.75, longitude: -93.1 })
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  let consulta = ''
  await page.route('**/api/finanzas/ruta-cobranza**', (route) => {
    consulta = new URL(route.request().url()).search
    return route.fulfill({ json: [
      { cliente_id: 5, nombre: 'Ana Lopez', contrato: 'A7F2', direccion: 'Calle 1 #20', estado: 'suspendido', total: 700, dias_atraso: 52, latitud: 16.751, longitud: -93.1, distancia_m: 111 },
      { cliente_id: 6, nombre: 'Beto Ruiz', contrato: 'B1C3', direccion: null, estado: 'activo', total: 350, dias_atraso: 5, latitud: null, longitud: null, distancia_m: null },
    ] })
  })
  await page.goto('/admin/cobranza')

  await page.getByRole('button', { name: 'Ruta' }).click()
  await page.getByRole('button', { name: 'Usar mi ubicación' }).click()
  await expect(page.getByText('Ana Lopez')).toBeVisible()
  expect(consulta).toBe('?latitud=16.75&longitud=-93.1')
  await expect(page.getByText('111 m')).toBeVisible()
  await expect(page.getByText('52 días de atraso · suspendido', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('href', /destination=16\.751%2C-93\.1/)
  await expect(page.getByText('Sin ubicación')).toBeVisible()
})

test('el inicio muestra el embudo de ventas por mes', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/dashboard/embudo**', (route) => route.fulfill({ json: [
    { mes: '2026-09', contactos_nuevos: 40, solicitudes: 11, por_agente: 1, instaladas: 9, canceladas: 2, abiertas: 0, dias_a_instalar: 0.5 },
    { mes: '2026-10', contactos_nuevos: 11, solicitudes: 9, por_agente: 4, instaladas: 5, canceladas: 2, abiertas: 2, dias_a_instalar: null },
  ] }))
  await page.goto('/admin/dashboard')

  await expect(page.getByRole('heading', { name: 'Ventas: de WhatsApp a instalado' })).toBeVisible()
  await expect(page.getByText('(4 del agente)')).toBeVisible()
  await expect(page.getByRole('row', { name: /Oct/ })).toContainText('9')
})

test('los contadores de clientes filtran por conexión y potencia', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/ftth/potencias', (route) => route.fulfill({ json: {
    1: { rx: -28.4, nivel: 'alta', fecha: '2026-10-06T10:05:00' },
  } }))
  await page.goto('/admin/clientes')

  const alta = page.getByRole('button', { name: /Potencia alta/ })
  await expect(alta).toContainText('1')
  await expect(page.getByRole('button', { name: /^0\s*Potencia normal/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^1\s*Online/ })).toBeVisible()
  await alta.click()
  await expect(alta).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('span:visible', { hasText: '-28.40 dBm' }).first()).toBeVisible()
  await page.getByRole('button', { name: /Potencia normal/ }).click()
  await expect(page.locator('span:visible', { hasText: '-28.40 dBm' })).toHaveCount(0)
})

test('el detalle del cliente lee su potencia óptica en vivo', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Cliente E2E', telefono: '5550000000', direccion: 'Dirección E2E', ip_asignada: '10.0.0.2',
    estado: 'activo', olt: { id: 7, nombre: 'Vicente Guerrero' }, onu_asignada: { id: 4, identificador: 'HWTC05450CB6' },
  } }))
  let lecturas = 0
  await page.route('**/api/ftth/clientes/1/potencia-actual', (route) => {
    lecturas += 1
    return route.fulfill({ json: { disponible: true, onu_online: true, rx: -20.92, tx: 2.27, nivel: 'normal' } })
  })
  await page.goto('/admin/clientes')

  if ((page.viewportSize()?.width ?? 1024) < 640) await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Red', exact: true }).click()
  await expect(page.getByText('-20.92 dBm')).toBeVisible()
  await expect(page.getByText('Potencia normal · TX 2.27 dBm', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a leer la potencia' }).click()
  await expect.poll(() => lecturas).toBeGreaterThanOrEqual(2)
})

test('la potencia en vivo lee cada minuto y se pausa a los 5 minutos', async ({ page }) => {
  await page.clock.install()
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Cliente E2E', telefono: '5550000000', direccion: 'Dirección E2E', ip_asignada: '10.0.0.2',
    estado: 'activo', olt: { id: 7, nombre: 'Vicente Guerrero' }, onu_asignada: { id: 4, identificador: 'HWTC05450CB6' },
  } }))
  let lecturas = 0
  await page.route('**/api/ftth/clientes/1/potencia-actual', (route) => {
    lecturas += 1
    return route.fulfill({ json: { disponible: true, onu_online: true, rx: -20.92, tx: 2.27, nivel: 'normal' } })
  })
  await page.goto('/admin/clientes')
  if ((page.viewportSize()?.width ?? 1024) < 640) await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Red', exact: true }).click()
  await expect(page.getByText('-20.92 dBm')).toBeVisible()
  const primera = lecturas

  await page.clock.runFor(30_000)
  expect(lecturas).toBe(primera)          // no cada 30 s
  await page.clock.runFor(31_000)
  await expect.poll(() => lecturas).toBe(primera + 1)  // cada minuto

  await page.clock.runFor(5 * 60_000)
  await expect(page.getByRole('button', { name: /Lectura en pausa/ })).toBeVisible()
  const enPausa = lecturas
  await page.clock.runFor(3 * 60_000)
  expect(lecturas).toBe(enPausa)          // en pausa ya no consulta la OLT

  await page.getByRole('button', { name: /Lectura en pausa/ }).click()
  await expect.poll(() => lecturas).toBe(enPausa + 1)
  await expect(page.getByRole('button', { name: /Lectura en pausa/ })).toHaveCount(0)
})

test('herramientas del cliente: estado de la ONU, potencia y reinicio', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/ftth/clientes/1/estado-onu', (route) => route.fulfill({ json: {
    disponible: true, olt: 'Vicente Guerrero', serial: 'HWTC05450CB6', modelo: 'HG8145V5V3', online: true,
    rx: -20.86, tx: 2.1, encendida: '4 h 46 min', ultima_caida: '2026/10/05 21:54:01',
    causa_ultima_caida: 'Se quedó sin luz (Power Off)', puede_reiniciar: true,
  } }))
  await page.route('**/api/ftth/clientes/1/potencia-actual', (route) => route.fulfill({ json: {
    disponible: true, onu_online: true, rx: -20.86, tx: 2.1, nivel: 'normal',
  } }))
  let reinicios = 0
  await page.route('**/api/clientes/1/reiniciar-onu', async (route) => {
    reinicios += 1
    await route.fulfill({ json: { status: 'success', data: { olt: 'Vicente Guerrero' } } })
  })
  await page.goto('/admin/clientes')

  await page.getByRole('button', { name: 'Herramientas de Cliente E2E' }).click()
  const herramientas = page.getByRole('dialog', { name: 'Herramientas del cliente' })

  await herramientas.getByRole('button', { name: /^ONU/ }).click()
  await expect(herramientas.getByText('ONU en línea')).toBeVisible()
  await expect(herramientas.getByText('4 h 46 min')).toBeVisible()
  await expect(herramientas.getByText('Se quedó sin luz (Power Off)')).toBeVisible()
  await herramientas.getByRole('button', { name: 'Volver', exact: true }).click()

  await herramientas.getByRole('button', { name: /^Potencia/ }).click()
  await expect(herramientas.getByText('-20.86 dBm')).toBeVisible()
  await herramientas.getByRole('button', { name: 'Volver', exact: true }).click()

  await herramientas.getByRole('button', { name: /^Reiniciar ONU/ }).click()
  await expect(herramientas.getByText('¿Reiniciar la ONU?')).toBeVisible()
  expect(reinicios).toBe(0)  // no reinicia sin confirmar
  await herramientas.getByRole('button', { name: 'Reiniciar ONU', exact: true }).click()
  await expect.poll(() => reinicios).toBe(1)
  await expect(page.getByText('La ONU se está reiniciando', { exact: false })).toBeVisible()
})
