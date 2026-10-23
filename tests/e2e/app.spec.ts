import { expect, test, type Page } from '@playwright/test'

import { authenticateAs, mockApi } from './helpers'

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

test('el radar OLT no consulta hasta abrir una OLT y la VSOL abre su panel', async ({ page }) => {
  const escaneos: string[] = []
  page.on('request', (request) => {
    if (/\/olts\/\d+\/(monitoreo|panel)/.test(request.url())) escaneos.push(request.url())
  })
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/olts/1/panel/pons', (route) => route.fulfill({ json: { status: 'success', data: [{ pon: 1, port_id: 5, nombre: 'PON 0/1' }] } }))
  await page.route('**/api/olts/1/panel/onus?**', (route) => route.fulfill({ json: { status: 'success', data: { olt: 'OLT Centro', total: 0, online: 0, offline: 0, onus: [] } } }))
  await page.goto('/admin/radar')

  await expect(page.getByRole('heading', { name: 'Radar OLT / Fibra' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué OLT quieres abrir?' })).toBeVisible()
  await expect(page.getByText('OLT Paraíso')).toBeVisible()
  expect(escaneos).toHaveLength(0)

  await page.getByRole('link', { name: 'Abrir OLT Centro' }).click()
  await expect(page).toHaveURL(/\/admin\/radar\/1\/panel$/)
  await expect(page.getByRole('button', { name: /PON 0\/1/ })).toBeVisible()
  expect(escaneos.every((url) => url.includes('/olts/1/panel'))).toBe(true)
})

test('carga el panel principal con sus contratos tipados', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  await expect(page.getByRole('heading', { name: 'Hola, admin-e2e' })).toBeVisible()
  await expect(page.getByText(/Panel de Control/)).toBeVisible()
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

  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
  if ((page.viewportSize()?.width ?? 1024) < 640) {
    await expect(page.locator('.app-bottom-nav')).toHaveCount(0)
    await page.getByRole('button', { name: 'Filtrar clientes' }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros de clientes' })).toBeVisible()
    await page.getByRole('button', { name: 'Listo' }).click()
    await expect(page.getByRole('link', { name: 'Llamar a Cliente E2E' })).toHaveAttribute('href', 'tel:5550000000')
    await expect(page.getByRole('link', { name: 'Abrir ubicación de Cliente E2E' })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=19.4326%2C-99.1332&travelmode=driving')
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

test('el aviso de potencias altas sale a la hora elegida y no en la madrugada', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  let guardado: Record<string, unknown> | null = null
  await page.route('**/api/configuracion/sistema', async (route) => {
    if (route.request().method() === 'PUT') {
      guardado = route.request().postDataJSON()
      await route.fulfill({ json: { status: 'ok', mensaje: 'Configuración guardada' } })
      return
    }
    await route.fallback()
  })
  await page.goto('/admin/configuracion/sistema')

  const hora = page.getByLabel('Hora del aviso de potencias altas')
  await expect(hora).toHaveValue('08:00')
  await hora.selectOption('07:00')
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect.poll(() => guardado?.hora_aviso_senal).toBe('07:00')

  await hora.selectOption({ label: 'No enviar el aviso' })
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect.poll(() => guardado?.hora_aviso_senal).toBe('')
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

  await expect(page.getByText('Cobrado hoy')).toBeVisible()
  await expect(page.getByText('cajero-e2e').first()).toBeVisible()
})

test('el panel sigue el modo nocturno o claro del celular, aun después de abrirse antes', async ({ page }) => {
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/admin/cobranza')
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  // Con la app abierta cambia al instante.
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Y al volver a abrirla manda el celular, no lo que vio la vez anterior.
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByText('Cobrado hoy')).toBeVisible()
})

test('el cobrador busca al cliente, cobra y ve el cobro en Hoy con su nombre', async ({ page }) => {
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  await page.route('**/api/finanzas/clientes/1/estado-cuenta', (route) => route.fulfill({ json: {
    total: 500, incluye: [], facturas: [{ id: 42, saldo_pendiente: 500 }], suspendido: false, factura_promesa_id: 42,
    detalle: [{ texto: 'Mensualidad de octubre', monto: 500, actual: true }],
  } }))
  let pago: Record<string, unknown> | null = null
  await page.route('**/api/sincronizacion/procesar', async (route) => {
    const operacion = route.request().postDataJSON().operaciones[0]
    pago = operacion.payload
    await route.fulfill({ json: { resultados: [{ id: operacion.id, estado: 'aplicada', respuesta: {} }] } })
  })
  await page.goto('/admin/cobranza')

  await page.getByLabel('Buscar cliente').fill('factura')
  await page.getByRole('button', { name: /Factura E2E/ }).click()
  const hoja = page.getByRole('dialog')
  await expect(hoja.getByText('Mensualidad de octubre')).toBeVisible()
  await expect(hoja.getByLabel('Monto recibido')).toHaveValue('500')
  await hoja.getByLabel('Monto recibido').fill('300')
  await expect(hoja.getByText(/Abono: quedan/)).toBeVisible()
  await hoja.getByRole('button', { name: /Cobrar \$300/ }).click()
  await expect.poll(() => pago).toMatchObject({ cliente_id: 1, metodo_pago: 'efectivo', monto_recibido: 300 })

  await page.getByRole('button', { name: 'Hoy' }).click()
  await expect(page.getByText('Cliente equivocado E2E')).toBeVisible()
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
  await expect(page.getByText('Cobrado hoy')).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Terminal de Cobro' })).toHaveCount(0)
  // En celular las secciones están en "Más"; en computadora, en el grupo Operaciones de la barra lateral.
  if ((page.viewportSize()?.width ?? 1024) < 1024) await page.getByRole('button', { name: 'Más', exact: true }).click()
  else await page.getByRole('button', { name: 'Operaciones' }).click()
  await expect(page.getByText('Órdenes / Instalaciones').last()).toBeVisible()
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
  await page.getByRole('row', { name: /Cliente E2E/ }).first().click()
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

  // El celular se recarga a media explicación: los datos siguen ahí.
  await page.reload()
  await expect(page.getByText('clave123')).toBeVisible()
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.getByRole('button', { name: /Ana Lopez/ }).click()
  await expect(page.getByText('Explicación para el cliente')).toBeVisible()

  // Hasta que el técnico termina la instalación.
  await page.getByRole('button', { name: 'Terminar instalación' }).click()
  await expect(page).toHaveURL(/\/tech\/dashboard/)
  await expect(page.getByText('instalación sin terminar')).toHaveCount(0)
})

test('el técnico simula el cobro de un cliente y le baja la imagen', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  // Sin menú de compartir: la imagen se descarga.
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }) })
  await page.route('**/api/zonas/simulador-cobro', (route) => route.fulfill({ json: [
    { id: 2, nombre: 'Paraíso', plantilla: { nombre: 'Día 15', dia_pago: 15, dias_tolerancia: 10 }, planes: [
      { id: 11, nombre: 'Plan 300', precio: 300, velocidad_bajada: 20480 },
    ] },
  ] }))
  let consulta = ''
  await page.route('**/api/zonas/2/simular-cobro**', async (route) => {
    consulta = new URL(route.request().url()).search
    await route.fulfill({ json: {
      zona: 'Paraíso', plan: 'Plan 300', velocidad_bajada: 20480,
      activacion: '2026-10-18', gratis_hasta: null, mensualidad_desde: '2026-11-15', mensualidad_hasta: '2026-12-14',
      corte: '2026-11-25', mensualidad: 300, meses_gratis: 0,
      prorrateo: { total: 270, desde: '2026-10-18', hasta: '2026-11-14', dias: 28 },
      primer_pago: { fecha: '2026-11-15', total: 570 },
      explicacion: ['No tiene mes gratis: el servicio se cobra desde hoy, 18 de octubre.'],
    } })
  })
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Simular cobro para un cliente' }).click()

  await page.getByRole('combobox', { name: 'Zona' }).selectOption('2')
  await expect(page.getByText('Pagan el día 15 de cada mes · 10 días de tolerancia')).toBeVisible()
  await page.getByRole('combobox', { name: 'Plan' }).selectOption('11')
  await page.getByLabel('Día de instalación').fill('2026-10-18')
  await page.getByRole('button', { name: /Cambio de compañía/ }).click()

  await expect(page.getByText('$570.00').first()).toBeVisible()
  await expect(page.getByTitle('Día de pago')).toHaveText('15')
  await expect.poll(() => new URLSearchParams(consulta).get('meses_gratis')).toBe('0')
  expect(new URLSearchParams(consulta).get('fecha')).toBe('2026-10-18')

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Enviar imagen al cliente' }).click()
  expect((await descarga).suggestedFilename()).toBe('cobro-Plan-300-2026-10-18.png')
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
    { id: 43, tipo: 'retiro', estado: 'asignada', version: 1, cliente_id: 9, cliente: { id: 9, nombre: 'Carla Diaz', direccion: 'Calle Tres 789', telefono: '5550002222', latitud: 16.7531, longitud: -93.1156 }, fecha_programada: null },
  ] }))
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  const ana = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Ana Lopez' }) })
  await expect(ana.getByRole('button', { name: 'Marcar en camino' })).toBeVisible()
  await expect(ana.getByRole('button', { name: 'Activar cliente' })).toHaveCount(0)
  const beto = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Beto Ruiz' }) })
  await expect(beto.getByRole('button', { name: 'Activar cliente' })).toBeVisible()
  await expect(beto.getByRole('button', { name: /Marcar en camino|Iniciar trabajo/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Retiros', exact: true }).click()
  const carla = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Carla Diaz' }) })
  await expect(carla.getByRole('button', { name: 'WhatsApp a Carla Diaz' })).toBeVisible()
  // La ruta va por coordenadas, no por la dirección escrita.
  await expect(carla.getByRole('link', { name: 'Cómo llegar con Carla Diaz' })).toHaveAttribute('href', /destination=16\.7531%2C-93\.1156/)
  await expect(carla.getByRole('button', { name: /Equipo recogido/ })).toBeVisible()
  await expect(carla.getByRole('button', { name: /Marcar en camino|Iniciar trabajo/ })).toHaveCount(0)
})

test('busca un cliente desde el encabezado global', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')
  await expect(page.getByRole('heading', { name: 'Hola, admin-e2e' })).toBeVisible()

  // En celular, la lupa del encabezado; en computadora, Ctrl+K.
  if ((page.viewportSize()?.width ?? 1024) < 1024) await page.getByRole('button', { name: 'Buscar cliente' }).click()
  else await page.keyboard.press('Control+k')
  const buscador = page.getByRole('searchbox', { name: 'Buscar cliente o sección' })
  await buscador.fill('Cliente')
  await expect(page.getByRole('button', { name: /Cliente Global E2E/ })).toBeVisible()

  // También lleva a una sección del sistema.
  await buscador.fill('radar')
  await page.getByRole('button', { name: 'Radar OLT' }).click()
  await expect(page).toHaveURL(/\/admin\/radar$/)
})

test('carga facturas y su resumen financiero', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/facturas')

  await expect(page.getByRole('main').getByRole('heading', { name: 'Facturas', exact: true })).toBeVisible()
  await expect(page.locator(':is(div, h3):visible').filter({ hasText: /^Factura E2E$/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Pendiente.*1 factura/ })).toBeVisible()
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

test('los reportes de falla salen en Órdenes › Reparaciones y se les cambia el técnico', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  const cambios: unknown[] = []
  await page.route('**/api/bajas/tecnicos/disponibles', (route) => route.fulfill({ json: [
    { id: 7, nombre_completo: 'Técnico Uno', usuario: 'tec1' },
    { id: 8, nombre_completo: 'Técnico Dos', usuario: 'tec2' },
  ] }))
  await page.route('**/api/ordenes/?tipo=instalacion', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/ordenes/?tipo=cambio_domicilio', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/ordenes/?tipo=reparacion', (route) => route.fulfill({ json: [
    { id: 52, version: 3, tipo: 'reparacion', estado: 'asignada', prioridad: 'urgente', categoria_soporte: 'cable_roto',
      descripcion: 'Subió la potencia a -31 dBm, revisar la fibra desde la caja',
      cliente: { nombre: 'Victor Constantino', telefono: '5550000000', direccion: 'Villa de Guadalupe' },
      tecnico: { id: 7, nombre: 'Técnico Uno', usuario: 'tec1' } },
    { id: 53, version: 1, tipo: 'reparacion', estado: 'terminada', categoria_soporte: 'lentitud',
      cliente: { nombre: 'Ya Resuelta' }, tecnico: null },
  ] }))
  await page.route('**/api/ordenes/52', async (route) => {
    cambios.push(route.request().postDataJSON())
    await route.fulfill({ json: { id: 52 } })
  })
  await page.goto('/admin/ordenes')
  await page.getByRole('tab', { name: 'Reparaciones' }).click()

  await expect(page).toHaveURL(/vista=reparaciones/)
  await expect(page.getByRole('heading', { name: 'Reparaciones' })).toBeVisible()
  await expect(page.getByText('🔧 Fibra o cable roto')).toBeVisible()
  await expect(page.getByText('Subió la potencia a -31 dBm', { exact: false })).toBeVisible()
  await expect(page.getByText('Ya Resuelta')).toHaveCount(0)   // las terminadas no salen
  await expect(page.getByRole('button', { name: 'Agendar visita de Victor Constantino' })).toHaveCount(0)

  await page.locator('select[aria-label="Técnico de Victor Constantino"]:visible').selectOption('8')
  await expect.poll(() => cambios).toEqual([{ tecnico_id: 8 }])
})

test('carga las transacciones y sus filtros financieros', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/transacciones')

  await expect(page.getByRole('main').getByRole('heading', { name: 'Corte de Cobranza' })).toBeVisible()
  await expect(page.getByText('Total cobrado')).toBeVisible()
  await expect(page.getByRole('button', { name: /Anular/ })).toBeVisible()
  await page.getByRole('button', { name: /Corregir/ }).click()
  await expect(page.getByRole('heading', { name: 'Corregir cobro #7' })).toBeVisible()
  await expect(page.getByText(/Origen: ERR-1.*Cliente equivocado E2E/)).toBeVisible()
})

test('busca pagos por nombre o folio en todas las fechas para anularlos', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/transacciones')

  const peticion = page.waitForRequest((request) => (
    request.url().includes('/finanzas/pagos-reporte')
    && new URL(request.url()).searchParams.get('busqueda') === 'beimar'
    && !new URL(request.url()).searchParams.has('start_date')
  ))
  await page.getByRole('searchbox', { name: 'Buscar pago por nombre, contrato, folio o referencia' }).fill('beimar')
  await peticion
  await expect(page.getByText('Buscando «beimar» en todas las fechas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Anular' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Hola, admin-e2e' })).toBeVisible()
  await expect(page.getByText(/Panel de Control/)).toBeVisible()
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

  await expect(page.getByRole('heading', { name: 'Buscar cliente' })).toBeVisible()
  await expect(page.getByText('Cliente E2E', { exact: true })).toBeVisible()
  await expect(page.getByText('E2E-1', { exact: true })).toBeVisible()
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

test('el cobrador ya no tiene ruta: cobra en local', async ({ page }) => {
  await authenticateAs(page, 'cajero')
  await mockApi(page)
  await page.goto('/admin/cobranza')
  await expect(page.getByRole('button', { name: 'Promesas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ruta' })).toHaveCount(0)
})

test('el técnico ve en su ruta los clientes cercanos con potencia alta y se lleva la revisión a su agenda', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 16.75, longitude: -93.1 })
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  let consulta = ''
  await page.route('**/api/soporte/ruta-reparacion**', (route) => {
    consulta = new URL(route.request().url()).search
    return route.fulfill({ json: [
      { cliente_id: 5, nombre: 'Ana Lopez', contrato: 'A7F2', direccion: 'Calle 1 #20', rx: -28.4, nivel: 'alta', fecha_lectura: null,
        nap: 'P1-V-CN-2-A', puerto_nap: 3, latitud: 16.751, longitud: -93.1, distancia_m: 111, reporte: null },
      { cliente_id: 6, nombre: 'Beto Ruiz', contrato: 'B1C3', direccion: null, rx: -25.6, nivel: 'limite', fecha_lectura: null,
        nap: null, puerto_nap: null, latitud: null, longitud: null, distancia_m: null, reporte: { id: 80, estado: 'asignada', tecnico: 'Carlos' } },
    ] })
  })
  let reporte: Record<string, unknown> | null = null
  await page.route('**/api/soporte/incidencias', async (route) => {
    reporte = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { id: 81 } })
  })
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Ruta', exact: true }).click()
  await page.getByRole('button', { name: 'Usar mi ubicación' }).click()

  const ana = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Ana Lopez' }) })
  await expect(ana.getByText('-28.40')).toBeVisible()
  expect(consulta).toBe('?latitud=16.75&longitud=-93.1')
  await expect(ana.getByText('alta · 111 m')).toBeVisible()
  await expect(ana.getByText('Contrato A7F2 · P1-V-CN-2-A P3')).toBeVisible()
  await expect(ana.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('href', /destination=16\.751%2C-93\.1/)
  const beto = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Beto Ruiz' }) })
  await expect(beto.getByText('Reporte #80 abierto · Carlos')).toBeVisible()

  await ana.getByRole('button', { name: 'Ir a revisar' }).click()
  await expect.poll(() => reporte).toMatchObject({ cliente_id: 5, categoria: 'potencia_baja', canal_reporte: 'monitoreo' })
  await expect(ana.getByText('Reporte #81 abierto · Tú')).toBeVisible()
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

test('un cliente cancelado se activa desde Editar eligiendo la ONU', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'la ficha se abre distinto en móvil')
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Keila Sánchez Bonifaz', telefono: '5550000000', direccion: 'Vicente Guerrero', ip_asignada: '10.10.10.27',
    estado: 'cancelado', olt: { id: 7, nombre: 'Vicente Guerrero', tecnologia: 'GPON' },
  } }))
  await page.route('**/api/inventario/?estado=DISPONIBLE', (route) => route.fulfill({ json: [
    { id: 300, identificador: 'HWTC0000AAAA', tecnologia: 'GPON', estado: 'DISPONIBLE' },
  ] }))
  await page.route('**/api/olts/', (route) => route.fulfill({ json: [{ id: 7, nombre: 'Vicente Guerrero', tecnologia: 'GPON' }] }))
  const enviados: unknown[] = []
  await page.route('**/api/clientes/1/reactivar', async (route) => {
    enviados.push(route.request().postDataJSON())
    await route.fulfill({ json: { status: 'success', baja_id: 11, mikrotik_estado: 'reactivado' } })
  })
  page.on('dialog', (dialog) => void dialog.accept())
  await page.goto('/admin/clientes')
  await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Editar' }).click()

  const panel = page.getByRole('region', { name: 'Activar cliente cancelado' })
  // Su ONU ya se recogió: sin elegir una, no se activa.
  await panel.getByRole('button', { name: 'Activar' }).click()
  await expect(page.getByText('Elige la ONU que se le instala')).toBeVisible()
  expect(enviados).toEqual([])
  await panel.getByLabel('ONU para activar').selectOption('300')
  await panel.getByRole('button', { name: 'Activar' }).click()
  await expect.poll(() => enviados).toEqual([{ onu_id: 300 }])
  await expect(page.getByText('Cliente activado')).toBeVisible()
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

test('con potencia alta se levanta el reporte de falla desde la lista con la revisión remota', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/ftth/potencias', (route) => route.fulfill({ json: {
    1: { rx: -31.2, nivel: 'alta', fecha: '2026-10-07T10:00:00' },
  } }))
  await page.route('**/api/soporte/abiertas', (route) => route.fulfill({ json: {} }))
  await page.route('**/api/soporte/clientes/1/contexto', (route) => route.fulfill({ json: { abierta: null, potencia_habitual: -21.5 } }))
  await page.route('**/api/ftth/clientes/1/estado-onu', (route) => route.fulfill({ json: {
    disponible: true, olt: 'Vicente Guerrero', serial: 'HWTC05450CB6', online: true, rx: -31.2,
  } }))
  await page.route('**/api/bajas/tecnicos/disponibles', (route) =>
    route.fulfill({ json: [{ id: 7, nombre_completo: 'Técnico Uno', usuario: 'tec1' }] }))
  let enviado: Record<string, unknown> | null = null
  await page.route('**/api/soporte/incidencias', async (route) => {
    enviado = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { id: 77 } })
  })
  await page.goto('/admin/clientes')

  await page.locator('button:visible', { hasText: 'Reportar falla' }).first().click()
  const herramientas = page.getByRole('dialog', { name: 'Herramientas del cliente' })
  await expect(herramientas.getByLabel('Revisión remota')).toHaveValue(/ONU en línea · potencia -31\.20 dBm \(normal -21\.50\)/)
  await expect(herramientas.getByLabel('Falla')).toHaveValue('potencia_baja')
  await expect(herramientas.getByLabel('Prioridad')).toHaveValue('alta')
  await expect(herramientas.getByLabel('Cómo se supo')).toHaveValue('monitoreo')

  await herramientas.getByLabel('Técnico', { exact: true }).selectOption('7')
  await herramientas.getByLabel('Qué debe hacer el técnico').fill('Revisar la fibra desde la caja')
  await herramientas.getByRole('button', { name: 'Crear y avisar al técnico' }).click()

  await expect.poll(() => enviado).not.toBeNull()
  expect(enviado).toMatchObject({ cliente_id: 1, categoria: 'potencia_baja', prioridad: 'alta', tecnico_id: 7, canal_reporte: 'monitoreo' })
  expect(String(enviado!.descripcion)).toMatch(/^Revisar la fibra desde la caja\n\nRevisión remota/)
  await expect(page.getByText('Reporte #77 creado', { exact: false })).toBeVisible()
})

test('la agenda del técnico separa instalaciones y reparaciones y pone primero las urgentes', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route(/\/api\/clientes\/$/, (route) => route.fulfill({ json: [] }))
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [
    { id: 60, tipo: 'instalacion', estado: 'asignada', version: 1, prioridad: 'normal', prospecto_nombre: 'Instalación Temprana',
      fecha_programada: '2026-10-08T08:00:00' },
    { id: 61, tipo: 'instalacion', estado: 'asignada', version: 1, prioridad: 'normal', prospecto_nombre: 'Instalación Tarde',
      fecha_programada: '2026-10-08T12:00:00' },
    { id: 62, tipo: 'reparacion', estado: 'asignada', version: 1, prioridad: 'urgente', categoria_soporte: 'cable_roto',
      cliente_id: 9, cliente: { id: 9, nombre: 'Fibra Rota' }, fecha_programada: null },
    { id: 63, tipo: 'retiro', estado: 'asignada', version: 1, cliente: { id: 10, nombre: 'Retiro Aparte' } },
  ] }))
  await page.goto('/tech/dashboard')

  await expect(page.getByText('Mi agenda').first()).toBeVisible()
  await expect(page.getByText('2 instalaciones', { exact: true })).toBeVisible()
  await expect(page.getByText('1 reparación', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Agenda', exact: true }).click()
  // La reparación urgente va primero aunque no tenga hora; luego por hora de visita.
  await expect(page.getByRole('heading', { level: 4 })).toHaveText(['Fibra Rota', 'Instalación Temprana', 'Instalación Tarde'])
  const fibra = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Fibra Rota' }) })
  await expect(fibra.getByText('🔧 Reparación')).toBeVisible()
})

test('el técnico ve la falla, verifica la señal y termina la reparación', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [
    { id: 55, tipo: 'reparacion', estado: 'trabajando', version: 2, cliente_id: 9, categoria_soporte: 'cable_roto', prioridad: 'urgente',
      descripcion: 'Revisar la fibra\n\nRevisión remota: ONU caída', cliente: { id: 9, nombre: 'Victor Martinez', direccion: 'Rancheria', telefono: '5550003333', latitud: 16.75, longitud: -93.11 }, fecha_programada: null },
  ] }))
  await page.route('**/api/soporte/incidencias/55/diagnosticar', (route) => route.fulfill({ json: {
    resultado: 'ok', sugerencia: null, olt: { disponible: true, onu_online: true, potencia_rx_dbm: '-21.04' },
  } }))
  await page.route('**/api/soporte/incidencias/55', (route) => route.fulfill({ json: { id: 55, version: 3 } }))
  let cierre: Record<string, unknown> | null = null
  await page.route('**/api/soporte/incidencias/55/resolver', async (route) => {
    cierre = route.request().postDataJSON()
    await route.fulfill({ json: { id: 55, estado: 'terminada' } })
  })
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  const victor = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Victor Martinez' }) })
  await expect(victor.getByText('🔧 Fibra o cable roto')).toBeVisible()
  await expect(victor.getByText('Revisión remota: ONU caída', { exact: false })).toBeVisible()
  await expect(victor.getByRole('button', { name: /Terminar reparación/ })).toBeDisabled()  // primero verificar señal

  await victor.getByRole('button', { name: 'Verificar señal' }).click()
  await expect(victor.getByText('ONU en línea · -21.04 dBm')).toBeVisible()
  await victor.getByLabel('Qué encontraste y qué hiciste').fill('Fibra doblada en el poste, se cambió el tramo')
  await victor.getByRole('button', { name: /Terminar reparación/ }).click()

  await expect.poll(() => cierre).toEqual({ solucion: 'Fibra doblada en el poste, se cambió el tramo', version: 3 })
  await expect(page.getByRole('heading', { name: 'Victor Martinez' })).toHaveCount(0)
})

const REVISION_VACIA = {
  categoria: 'sin_internet', potencia_antes: null, potencia_ultima: null, plan: { nombre: '50 Megas', bajada_kbps: 51200, subida_kbps: 10240 },
  nap: null, vecinos: [], onu: null, acceso_onu: [], extensores: [],
}

async function reparacionEnCurso(page: Page, categoria: string, estado: string, revision: Record<string, unknown>, diagnostico: Record<string, unknown>, rutas?: () => Promise<void>) {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await rutas?.()
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [
    { id: 57, tipo: 'reparacion', estado, version: 2, cliente_id: 9, categoria_soporte: categoria, prioridad: 'alta',
      descripcion: 'Reporte', cliente: { id: 9, contrato: 'VM01', nombre: 'Victor Martinez', direccion: 'Rancheria', telefono: '4811234567' }, fecha_programada: null },
  ] }))
  await page.route('**/api/clientes/VM01/portal', (route) => route.fulfill({ json: {
    id: 9, cedula: 'VM01', estado: 'activo', telefono: '4811234567', latitud: 16.7, longitud: -93.1, total_deuda: 0,
    suggested_user: 'victor.martinez', suggested_pass: 'Fz12345', identificador_onu: 'HWTC11111111', potencia_optica: '-30.10 dBm',
  } }))
  await page.route('**/api/network/diagnostico/conexion/9', (route) => route.fulfill({ json: { online: true, datos: { uptime: '5m' } } }))
  await page.route('**/api/network/diagnostico/trafico/9', (route) => route.fulfill({ json: { velocidad_bajada: 0, velocidad_subida: 0 } }))
  await page.route('**/api/ordenes/57/revision', (route) => route.fulfill({ json: { ...REVISION_VACIA, categoria, ...revision } }))
  await page.route('**/api/soporte/incidencias/57/diagnosticar', (route) => route.fulfill({ json: {
    resultado: 'ok', sugerencia: null,
    mikrotik: { disponible: true, pppoe_online: true, uptime: '5m', trafico_bajada_bps: 0, trafico_subida_bps: 0, perdida_paquetes_porcentaje: 0 },
    olt: { disponible: true, onu_online: true, potencia_rx_dbm: '-21.00' },
    ...diagnostico,
  } }))
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()
  return page.locator('article').filter({ has: page.getByRole('heading', { name: 'Victor Martinez' }) })
}

test('potencia alta: compara antes y ahora, dice si sigue alta y muestra los vecinos de la caja', async ({ page }) => {
  const orden = await reparacionEnCurso(page, 'potencia_baja', 'en_camino', {
    potencia_antes: { rx: -30.1, fecha: '2026-10-09T08:00:00' },
    nap: { nombre: 'P1-V-CN-2-A', puerto: 3, coordenadas: '22.1,-100.5', ubicacion: 'Poste 4' },
    vecinos: [
      { nombre: 'Ana Diaz', puerto: 1, potencia: { rx: -29.5 } },
      { nombre: 'Eva Ruiz', puerto: 2, potencia: { rx: -28.8 } },
      { nombre: 'Celia Gomez', puerto: 4, potencia: { rx: -21.0 } },
    ],
  }, { olt: { disponible: true, onu_online: true, potencia_rx_dbm: '-28.00' } })
  const revision = orden.getByRole('region', { name: 'Revisión de la falla' })
  await expect(revision.getByText('-30.10')).toBeVisible()
  await expect(revision.getByText('2 de 3 vecinos de la caja también tienen la potencia alta', { exact: false })).toBeVisible()
  await expect(revision.getByRole('link', { name: /Ir a la caja/ })).toBeVisible()

  await revision.getByRole('button', { name: 'Revisar ahora' }).click()
  await expect(revision.getByText('Mejoró 2.1 dB')).toBeVisible()
  await expect(revision.getByText('Sigue alta (-28.00 dBm)', { exact: false })).toBeVisible()
})

test('fibra rota: identifica con láser la caja y el puerto, etiqueta el conector y corrige un puerto mal registrado', async ({ page }) => {
  const envios: Record<string, unknown>[] = []
  const orden = await reparacionEnCurso(page, 'cable_roto', 'en_camino', {
    nap: { id: 4, nombre: 'P1-V-CN-2-A', puerto: 1, capacidad: 8, coordenadas: null, ubicacion: null },
    identificacion: { identificado_en: null, etiquetado: false, contrato: 'VM01' },
    avance: { identificados: 12, total: 250 },
  }, {}, async () => {
    await page.route('**/api/infraestructura/naps/cercanas**', (route) => route.fulfill({ json: [
      { id: 4, nombre: 'P1-V-CN-2-A', capacidad: 8, distancia_m: 40, puertos_libres: 0, posicion_estimada: false },
      { id: 5, nombre: 'P1-V-CN-3-B', capacidad: 8, distancia_m: 120, puertos_libres: 2, posicion_estimada: false },
    ] }))
    await page.route('**/api/infraestructura/naps/4/detalles', (route) => route.fulfill({ json: [
      { id: 9, nombre: 'Victor Martinez', cedula: 'VM01', puerto_nap: 1 },
      { id: 300, nombre: 'Ana Diaz', cedula: 'AD01', puerto_nap: 3 },
    ] }))
  })
  await page.route('**/api/ordenes/57/identificar-nap', async (route) => {
    const datos = route.request().postDataJSON()
    envios.push(datos)
    if (!datos.quitar_a_otro) {
      await route.fulfill({ status: 409, json: { detail: 'El puerto 3 de P1-V-CN-2-A está registrado a Ana Diaz (contrato AD01). Si el láser marca este puerto, confirma para quitárselo.' } })
      return
    }
    await route.fulfill({ json: { caja: 'P1-V-CN-2-A', puerto: 3, etiquetado: true, identificado_en: '2026-10-11T09:00:00' } })
  })

  const revision = orden.getByRole('region', { name: 'Revisión de la falla' })
  await expect(revision.getByText('Red identificada: 12 de 250')).toBeVisible()
  await expect(revision.getByText('Etiqueta el conector con el contrato', { exact: false })).toBeVisible()
  await expect(revision.getByLabel('Caja NAP')).toHaveValue('4')
  await revision.getByLabel('Puerto que marcó el láser').selectOption({ label: 'P3 · Ana Diaz' })
  await revision.getByLabel('Etiqueté el conector con el contrato VM01').check()
  await revision.getByRole('button', { name: /Guardar identificación/ }).click()
  await expect(revision.getByText('está registrado a Ana Diaz (contrato AD01)', { exact: false })).toBeVisible()
  await revision.getByRole('button', { name: /el láser marca este puerto: quitárselo/ }).click()
  await expect.poll(() => envios.length).toBe(2)
  expect(envios[1]).toEqual({ caja_nap_id: 4, puerto: 3, etiquetado: true, quitar_a_otro: true })
})

test('sin internet: fibra bien pero sin PPPoE apunta a la ONU', async ({ page }) => {
  const orden = await reparacionEnCurso(page, 'sin_internet', 'en_camino', {}, {
    mikrotik: { disponible: true, pppoe_online: false },
    olt: { disponible: true, onu_online: true, potencia_rx_dbm: '-20.50' },
  })
  const revision = orden.getByRole('region', { name: 'Revisión de la falla' })
  await revision.getByRole('button', { name: 'Revisar ahora' }).click()
  await expect(revision.getByText('Potencia de la fibra (-20.50 dBm)')).toBeVisible()
  await expect(revision.getByText('La fibra está bien pero no hay sesión PPPoE', { exact: false })).toBeVisible()
})

test('router o WiFi: entra a la ONU con sus cuentas y anota el extensor', async ({ page }) => {
  const orden = await reparacionEnCurso(page, 'router_wifi', 'en_camino', {
    acceso_onu: [{ marca: 'huawei', url: 'http://192.168.100.1', cuentas: [{ usuario: 'telecomadmin', clave: 'admintelecom' }] }],
  }, {})
  let extensor: Record<string, unknown> | null = null
  await page.route('**/api/ordenes/57/extensor', async (route) => {
    extensor = route.request().postDataJSON()
    await route.fulfill({ json: { detalle: 'TP-Link en la sala' } })
  })
  const revision = orden.getByRole('region', { name: 'Revisión de la falla' })
  await expect(revision.getByRole('link', { name: /Abrir ONU Huawei · 192.168.100.1/ })).toHaveAttribute('href', 'http://192.168.100.1')
  await expect(revision.getByText('telecomadmin / admintelecom')).toBeVisible()
  await revision.getByRole('button', { name: 'Anotar extensor de rango' }).click()
  await revision.getByLabel('Extensor de rango').fill('TP-Link en la sala')
  await revision.getByRole('button', { name: 'Anotar', exact: true }).click()
  await expect.poll(() => extensor).toEqual({ detalle: 'TP-Link en la sala' })
})

test('trabajando: la misma revisión sirve para terminar y avisa si la potencia sigue alta', async ({ page }) => {
  const orden = await reparacionEnCurso(page, 'cable_roto', 'trabajando', {}, {
    olt: { disponible: true, onu_online: true, potencia_rx_dbm: '-28.40' },
  })
  let cierre: Record<string, unknown> | null = null
  await page.route('**/api/soporte/incidencias/57', (route) => route.fulfill({ json: { id: 57, version: 4 } }))
  await page.route('**/api/soporte/incidencias/57/resolver', async (route) => {
    cierre = route.request().postDataJSON()
    await route.fulfill({ json: { id: 57, estado: 'terminada' } })
  })
  await expect(orden.getByRole('button', { name: /Terminar reparación/ })).toBeDisabled()
  await orden.getByRole('button', { name: 'Verificar señal' }).click()
  await expect(orden.getByText('Si la dejas así, explica por qué.', { exact: false })).toBeVisible()
  await orden.getByLabel('Qué encontraste y qué hiciste').fill('Se empalmó, el poste sigue con la caja dañada')
  await orden.getByRole('button', { name: /Terminar reparación/ }).click()
  await expect.poll(() => cierre).toEqual({ solucion: 'Se empalmó, el poste sigue con la caja dañada', version: 4 })
})

test('en camino a una reparación el técnico ve PPPoE y potencia, completa el teléfono y cambia la ONU', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.route(/\/api\/ordenes\/$/, (route) => route.fulfill({ json: [
    { id: 56, tipo: 'reparacion', estado: 'en_camino', version: 2, cliente_id: 9, categoria_soporte: 'sin_internet', prioridad: 'alta',
      descripcion: 'Subió la potencia', cliente: { id: 9, contrato: 'VM01', nombre: 'Victor Martinez', direccion: 'Rancheria', telefono: null }, fecha_programada: null },
  ] }))
  let ficha = { id: 9, cedula: 'VM01', telefono: null as string | null, latitud: null, longitud: null, suggested_user: 'victor.martinez',
    suggested_pass: 'Fz12345', identificador_onu: 'HWTC11111111', potencia_optica: '-29.10 dBm' }
  await page.route('**/api/clientes/VM01/portal', (route) => route.fulfill({ json: ficha }))
  await page.route('**/api/network/diagnostico/conexion/9', (route) => route.fulfill({ json: { online: true, datos: { uptime: '5m' } } }))
  await page.route('**/api/network/diagnostico/trafico/9', (route) => route.fulfill({ json: { velocidad_bajada: 3_000_000, velocidad_subida: 500_000 } }))
  let contacto: Record<string, unknown> | null = null
  await page.route('**/api/ordenes/56/cliente-contacto', async (route) => {
    contacto = route.request().postDataJSON()
    ficha = { ...ficha, telefono: '4811234567' }
    await route.fulfill({ json: { telefono: '4811234567' } })
  })
  await page.route('**/api/ordenes/56/revision', (route) => route.fulfill({ json: REVISION_VACIA }))
  await page.route('**/api/ordenes/56/onus-disponibles', (route) => route.fulfill({ json: [
    { id: 11, identificador: 'HWTC22222222', modelo: 'HG8145V5' },
  ] }))
  let cambio: Record<string, unknown> | null = null
  await page.route('**/api/ordenes/56/cambiar-onu', async (route) => {
    cambio = route.request().postDataJSON()
    ficha = { ...ficha, identificador_onu: 'HWTC22222222' }
    await route.fulfill({ json: { onu: 'HWTC22222222', onu_anterior: 'HWTC11111111' } })
  })
  await page.goto('/tech/dashboard')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  const datos = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Victor Martinez' }) })
    .getByRole('region', { name: 'Datos del cliente' })
  await expect(datos.getByText('victor.martinez')).toBeVisible()
  await expect(datos.getByText('Fz12345')).toBeVisible()
  await expect(datos.getByText('-29.10 dBm')).toBeVisible()
  await expect(datos.getByText('Conectado · 5m')).toBeVisible()
  await expect(datos.getByText('Sin teléfono')).toBeVisible()

  await datos.getByRole('button', { name: 'Editar teléfono' }).click()
  await datos.getByLabel('Teléfono del cliente').fill('481 123 4567')
  await datos.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect.poll(() => contacto).toEqual({ telefono: '481 123 4567' })
  await expect(datos.getByText('4811234567')).toBeVisible()

  await datos.getByRole('button', { name: 'Cambiar ONU' }).click()
  await datos.getByLabel('ONU nueva').fill('2222')
  await datos.getByRole('option', { name: /HWTC22222222/ }).click()
  await datos.getByRole('button', { name: /Guardar cambio de ONU/ }).click()
  await expect.poll(() => cambio).toEqual({ estado_vieja_onu: 'CON_FALLA', onu_id: 11 })
  await expect(datos.getByText('HWTC22222222')).toBeVisible()
})

test('el enlace del aviso de señal muestra esos clientes y deja mandar técnico aunque solo hayan caído 3 dB', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/ftth/potencias', (route) => route.fulfill({ json: {
    1: { rx: -22.0, nivel: 'normal', fecha: '2026-10-07T10:00:00' },
  } }))
  await page.route('**/api/soporte/abiertas', (route) => route.fulfill({ json: {} }))
  await page.goto('/admin/clientes?revisar=1')

  await expect(page.getByText('Clientes del aviso de señal (1)', { exact: false })).toBeVisible()
  await expect(page.locator('button:visible', { hasText: 'Reportar falla' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Ver todos' }).click()
  await expect(page.getByText('Clientes del aviso de señal', { exact: false })).toHaveCount(0)
  await expect(page.locator('button:visible', { hasText: 'Reportar falla' })).toHaveCount(0)  // potencia normal: sin acceso
})

test('panel de la OLT: lista como la VSOL, acciones con confirmación y detalle', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  const fila = (onuid: number, online: boolean, descripcion: string, serial: string) => ({
    onu_id: `GPON0/4:${onuid}`, pon: 4, onuid, online, descripcion, modelo: online ? 'HG8145V5V3' : 'unknown',
    perfil: 'default', modo: 'SN', serial, marcada: false, activa: true, rx: online ? '-17.17' : null, tx: '2.02',
    estado_admin: 'enable', estado_omcc: 'enable', fase: online ? 'working' : 'offline', ultimo_registro: '2026/10/08 10:44:52',
    ultima_baja: 'N/A', causa_ultima_baja: 'N/A', tiempo_activa: '3 09:43:53', cliente_id: 7, cliente_nombre: descripcion,
  })
  await page.route('**/api/olts/7/panel/pons', (route) => route.fulfill({ json: { status: 'success', data: [
    { pon: 1, port_id: 5, nombre: 'PON 0/1' }, { pon: 4, port_id: 8, nombre: 'PON 0/4' },
  ] } }))
  await page.route('**/api/olts/7/panel/onus?**', (route) => route.fulfill({ json: { status: 'success', data: {
    olt: 'Vicente Guerrero', total: 3, online: 2, offline: 1, onus: [
      fila(1, false, 'Jose Luis Valencia Gomez E7D2', 'HWTCae02efae'),
      fila(2, true, 'Teresa Gomez Lopez 5BAF', 'HWTCdec861ad'),
      fila(3, true, 'Claudia Vazquez Mendez AD20', 'HWTC0b5f63af'),
    ] } } }))
  const acciones: unknown[] = []
  await page.route('**/api/olts/7/panel/onus/4/2/accion', async (route) => {
    acciones.push(route.request().postDataJSON())
    await route.fulfill({ json: { status: 'success', data: { ok: true } } })
  })
  await page.route('**/api/olts/7/panel/onus/4/2', (route) => route.fulfill({ json: { status: 'success', data: {
    onu_id: 'GPON0/4:2', online: true,
    detalle: { Description: 'Teresa Gomez Lopez 5BAF', 'Main Software Version': 'V5R022C00S266', SN: 'HWTCdec861ad', 'System Uptime': '302006 s', 'Equipment ID': 'HG8145X6-10' },
    optica: { 'Rx Optical Level(ONU)': '-15.48', 'Lower Rx Optical Threshold': '-25.00', 'Upper Rx Optical Threshold': '-8.00', 'Tx Optical Level': '2.33', Distance: '439', Interface: 'PON_0/4' },
  } } }))
  await page.goto('/admin/radar/7/panel')

  await expect(page.getByRole('button', { name: /PON 0\/1/ })).toBeVisible()
  await expect(page.getByText('Teresa Gomez Lopez 5BAF').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('Offline', { exact: true }).filter({ visible: true })).toBeVisible()

  await page.getByRole('button', { name: 'Eliminar GPON0/4:2' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Eliminar ONU' })
  await expect(dialogo).toBeVisible()
  expect(acciones).toHaveLength(0)  // no borra sin confirmar
  await dialogo.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect.poll(() => acciones).toEqual([{ accion: 'eliminar', serial: 'HWTCdec861ad' }])

  await page.getByRole('button', { name: 'Ver GPON0/4:2' }).click()
  await expect(page.getByText('Información Detallada')).toBeVisible()
  await expect(page.getByText('-15.48 dBm')).toBeVisible()
  await expect(page.getByText('3d 11h 53m 26s')).toBeVisible()
})

test('panel de la OLT: Eliminar Todo pide escribir el PON', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/olts/7/panel/pons', (route) => route.fulfill({ json: { status: 'success', data: [{ pon: 4, port_id: 8, nombre: 'PON 0/4' }] } }))
  await page.route('**/api/olts/7/panel/onus?**', (route) => route.fulfill({ json: { status: 'success', data: { olt: 'VG', total: 0, online: 0, offline: 0, onus: [] } } }))
  let borrados = 0
  await page.route('**/api/olts/7/panel/pon/4/eliminar-todo', async (route) => { borrados += 1; await route.fulfill({ json: { status: 'success', data: { ok: true } } }) })
  await page.goto('/admin/radar/7/panel')

  await page.getByRole('button', { name: 'Eliminar Todo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Eliminar Todo' })
  const boton = dialogo.getByRole('button', { name: 'Eliminar Todo' })
  await expect(boton).toBeDisabled()
  await dialogo.getByLabel('Confirmación').fill('PON 0/4')
  await boton.click()
  await expect.poll(() => borrados).toBe(1)
})

async function panelBase(page: Page) {
  await authenticateAs(page)
  await mockApi(page)
  const onu = {
    onu_id: 'GPON0/4:2', pon: 4, onuid: 2, online: true, descripcion: 'Teresa Gomez Lopez 5BAF', modelo: 'HG8145X6-10',
    perfil: 'default', modo: 'SN', serial: 'HWTCdec861ad', marcada: false, activa: true, rx: '-15.48', tx: '2.3',
    estado_admin: 'enable', estado_omcc: 'enable', fase: 'working', ultimo_registro: null, ultima_baja: null,
    causa_ultima_baja: null, tiempo_activa: null, cliente_id: 1, cliente_nombre: 'Teresa Gomez Lopez',
  }
  await page.route('**/api/olts/7/panel/pons', (route) => route.fulfill({ json: { status: 'success', data: [{ pon: 4, port_id: 8, nombre: 'PON 0/4' }] } }))
  await page.route('**/api/olts/7/panel/onus?**', (route) => route.fulfill({ json: { status: 'success', data: { olt: 'Vicente Guerrero', total: 1, online: 1, offline: 0, onus: [onu] } } }))
  await page.route('**/api/olts/7/panel/onus/4/2', (route) => route.fulfill({ json: { status: 'success', data: { onu_id: 'GPON0/4:2', online: true, detalle: {}, optica: {} } } }))
  await page.route('**/api/olts/7/panel/pon/4/perfiles', (route) => route.fulfill({ json: { status: 'success', data: {
    onu_id_sugerido: '1', perfil_linea: ['line_INTERNET'], perfil_servicio: ['srv_INTERNET'], perfil_alarma: ['alarm_INTERNET'],
    perfil_onu: ['default'], perfil_privado: [], perfil_formato: [], modos: { 0: 'SN', 1: 'LOID', 2: 'LOID + contraseña', 3: 'Contraseña', 4: 'SN + contraseña' },
  } } }))
}

test('panel de la OLT: pestañas del detalle y volver a la lista', async ({ page }) => {
  await panelBase(page)
  await page.route('**/api/olts/7/panel/onus/4/2/seccion/linea', (route) => route.fulfill({ json: { status: 'success', data: {
    tcont: [{ tcontid: '1', tcontname: 'tcont_1', dbaprofile: 'dba_INTERNET' }], gemport: [], vlan_puerto: [],
    servicio: [{ servicename: 'ser_INTERNET', gemid: '1', vlanmode: '1', vlanlist: '10,4', coslist: 'N/A' }],
    service_port: [{ servicePort: '1', gemport: '1', vlan: '10', beginVid: '10', endVid: '10', sVlan: 'N/A', mode: '1:1', description: 'N/A' }],
  } } }))
  await page.route('**/api/olts/7/panel/pon/4/versiones', (route) => route.fulfill({ json: { status: 'success', data: [
    { onu_id: 'GPON0/4:2', descripcion: 'Teresa Gomez Lopez 5BAF', version_principal: 'V5R022C00S266', version_standby: 'V5R022C00S266', version_hw: '2C6D.A' },
  ] } }))
  await page.goto('/admin/radar/7/panel')

  await expect(page.getByLabel('Navegación del panel').getByRole('link', { name: 'Radar', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Versión de la ONU' }).click()
  await expect(page.getByText('V5R022C00S266').first()).toBeVisible()
  await page.getByRole('button', { name: 'Lista de ONUs', exact: true }).last().click()

  await page.getByRole('button', { name: 'Ver GPON0/4:2' }).click()
  await page.getByRole('tab', { name: 'Línea' }).click()
  await expect(page.getByText('dba_INTERNET')).toBeVisible()
  await expect(page.getByRole('cell', { name: '10,4' })).toBeVisible()
  await page.getByRole('button', { name: 'Lista de ONUs' }).first().click()
  await expect(page.getByRole('button', { name: 'Ver GPON0/4:2' })).toBeVisible()
})

test('panel de la OLT: añadir manualmente y modificar como la VSOL', async ({ page }) => {
  await panelBase(page)
  const altas: unknown[] = []
  const cambios: unknown[] = []
  await page.route('**/api/olts/7/panel/pon/4/alta', async (route) => { altas.push(route.request().postDataJSON()); await route.fulfill({ json: { status: 'success', data: { ok: true } } }) })
  await page.route('**/api/olts/7/panel/onus/4/2/modificar', async (route) => { cambios.push(route.request().postDataJSON()); await route.fulfill({ json: { status: 'success', data: { ok: true } } }) })
  await page.goto('/admin/radar/7/panel')

  await page.getByRole('button', { name: 'Añadir Manualmente' }).click()
  const alta = page.getByRole('dialog', { name: 'Añadir Manualmente · PON 0/4' })
  await alta.getByLabel('SN', { exact: true }).fill('HWTC0B46D3AF')
  await alta.getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect.poll(() => altas).toEqual([expect.objectContaining({
    onuid: 1, modo: '0', sn: 'HWTC0B46D3AF', perfil_onu: 'default', perfil_linea: 'line_INTERNET', perfil_servicio: 'srv_INTERNET', perfil_alarma: 'alarm_INTERNET',
  })])

  await page.getByRole('button', { name: 'Modificar GPON0/4:2' }).click()
  const modificar = page.getByRole('dialog', { name: 'Modificar GPON0/4:2' })
  await modificar.getByLabel('SN', { exact: true }).fill('HWTC0B46D3AF')
  await modificar.getByRole('button', { name: 'Aplicar' }).click()
  await expect.poll(() => cambios).toEqual([{ serial: 'HWTCdec861ad', modo: '0', valor: 'HWTC0B46D3AF', perfil: null }])
})

test('panel de la OLT: editar pestañas con confirmación', async ({ page }) => {
  await panelBase(page)
  await page.route('**/api/olts/7/panel/onus/4/2/seccion/puerto', (route) => route.fulfill({ json: { status: 'success', data: { puertos: [
    { selectonuport: '1', en_port: '0', loop_detect: '0', selectPortSpeed: '0x0', mac_limit: '0', us_cir: '0', us_pir: '0', ds_cir: '0', ds_pir: '0' },
    { selectonuport: '2', en_port: '0', loop_detect: '0', selectPortSpeed: '0x0', mac_limit: '0', us_cir: '0', us_pir: '0', ds_cir: '0', ds_pir: '0' },
  ], estado: [
    { selectonuport: '1', link_status: 'up', admin_status: 'enable', loop_status: 'disable', speed_config: 'auto', speed_status: 'unknown', max_frame: '1632' },
    { selectonuport: '2', link_status: 'up', admin_status: 'enable', loop_status: 'disable', speed_config: 'auto', speed_status: 'unknown', max_frame: '1632' },
  ] } } }))
  await page.route('**/api/olts/7/panel/onus/4/2/seccion/linea', (route) => route.fulfill({ json: { status: 'success', data: {
    tcont: [], gemport: [], servicio: [], vlan_puerto: [], perfiles_dba: ['dba_INTERNET'],
    service_port: [{ servicePort: '2', gemport: '1', vlan: '4', beginVid: '4', endVid: '4', sVlan: 'N/A', mode: '1:1', description: 'N/A' }],
  } } }))
  const cambios: unknown[] = []
  await page.route('**/api/olts/7/panel/onus/4/2/config', async (route) => { cambios.push(route.request().postDataJSON()); await route.fulfill({ json: { status: 'success', data: { ok: true } } }) })
  await page.goto('/admin/radar/7/panel')
  await page.getByRole('button', { name: 'Ver GPON0/4:2' }).click()

  await page.getByRole('tab', { name: 'Puerto' }).click()
  await page.getByLabel('Puerto a configurar').selectOption('2')
  const subida = page.locator('form', { hasText: 'ETH 2: límite de subida' })
  await subida.getByLabel('PIR (kbps)').fill('20000')
  await subida.getByRole('button', { name: 'Aplicar' }).click()
  expect(cambios).toHaveLength(0)  // pide confirmación
  await page.getByRole('dialog', { name: 'ETH 2: límite de subida' }).getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(() => cambios).toEqual([{ serial: 'HWTCdec861ad', operacion: 'puerto_subida', datos: { us_cir: '0', us_pir: '20000', selectonuport: '2' } }])

  // El básico parte del estado real (admin enable), no del en_port=0 que reporta la OLT.
  const basico = page.locator('form', { hasText: 'ETH 2: datos básicos' })
  await basico.getByLabel('Velocidad').selectOption('0x3')
  await basico.getByRole('button', { name: 'Aplicar' }).click()
  await page.getByRole('dialog', { name: 'ETH 2: datos básicos' }).getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(() => cambios.length).toBe(2)
  expect(cambios[1]).toEqual({ serial: 'HWTCdec861ad', operacion: 'puerto_basico', datos: { en_port: '1', loop_detect: '0', selectPortSpeed: '0x3', mac_limit: '0', selectonuport: '2' } })
  cambios.length = 0

  await page.getByRole('tab', { name: 'Línea' }).click()
  await page.getByRole('button', { name: 'Borrar service port 2' }).click()
  await page.getByRole('dialog', { name: 'Borrar service port 2' }).getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(() => cambios.length).toBe(1)
  expect(cambios[0]).toEqual({ serial: 'HWTCdec861ad', operacion: 'service_port_borrar', datos: { srvid: '2' } })
})

test('clientes por radioenlace: ícono de antena, estado de la antena y revisarla desde herramientas', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  const base = {
    cedula: '', telefono: '', direccion: '', zona: 'Sagrado Corazon', identificador_onu: 'Sin registrar',
    servicio: { plan_nombre: 'Básico', precio_plan: 220, ip_asignada: '10.10.10.41', router_nombre: 'VG', estado_servicio: 'activo', nap_info: 'No Asignado' },
    finanzas: { facturas_pendientes_cant: 0, total_deuda: 0, saldo_a_favor: 0, estado_financiero: 'al_dia' },
  }
  await page.route('**/api/clientes/listado-completo-unificado', (route) => route.fulfill({ json: [
    { ...base, id: 291, nombre: 'Concepcion Radio', tipo_conexion: 'radio', antena: { ip: '192.168.1.20', responde: false, latencia_ms: null, perdida: 100, fecha: '2026-10-11T22:00:00' } },
    { ...base, id: 165, nombre: 'Teresa Fibra', zona: 'Vicente Guerrero', tipo_conexion: 'fibra', antena: null },
  ] }))
  let revisiones = 0
  await page.route('**/api/clientes/291/verificar-antena', async (route) => {
    revisiones += 1
    await route.fulfill({ json: { status: 'success', data: { ip: '192.168.1.20', responde: true, latencia_ms: 3.2, perdida: 0, fecha: '2026-10-11T22:05:00' } } })
  })
  await page.goto('/admin/clientes')

  await expect(page.getByLabel('Radioenlace').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByLabel('Fibra óptica').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('Antena no responde').filter({ visible: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Herramientas de Concepcion Radio' }).filter({ visible: true }).click()
  const herramientas = page.getByRole('dialog', { name: 'Herramientas del cliente' })
  await expect(herramientas.getByRole('button', { name: /^ONU/ })).toHaveCount(0)
  await herramientas.getByRole('button', { name: /^Antena/ }).click()
  await expect(herramientas.getByText('La antena responde')).toBeVisible()
  await expect(herramientas.getByText('3.2 ms')).toBeVisible()
  expect(revisiones).toBe(1)
})

test('la IP de un cliente de radio abre su router en el puerto que contesta', async ({ page, context }) => {
  await authenticateAs(page)
  await mockApi(page)
  const base = {
    cedula: '', telefono: '', direccion: '', zona: 'Sagrado Corazon', identificador_onu: 'Sin registrar', antena: null,
    finanzas: { facturas_pendientes_cant: 0, total_deuda: 0, saldo_a_favor: 0, estado_financiero: 'al_dia' },
  }
  const servicio = (ip: string) => ({ plan_nombre: 'Básico', precio_plan: 220, ip_asignada: ip, router_nombre: 'VG', estado_servicio: 'activo', nap_info: 'No Asignado' })
  await page.route('**/api/clientes/listado-completo-unificado', (route) => route.fulfill({ json: [
    { ...base, id: 291, nombre: 'Concepcion Radio', tipo_conexion: 'radio', servicio: servicio('10.10.10.41') },
    { ...base, id: 165, nombre: 'Teresa Fibra', tipo_conexion: 'fibra', servicio: servicio('10.10.10.42') },
  ] }))
  // El servidor prueba los puertos: el router de radio contesta en el 8080; la ONU no contesta y se abre en el de su marca.
  await page.route(/\/api\/clientes\/acceso-web/, (route) => {
    const ip = new URL(route.request().url()).searchParams.get('ip')
    return route.fulfill({ json: ip === '10.10.10.41'
      ? { ip, marca: 'radio', puerto: '8080', responde: true, probados: ['8080', '80', '8090'], url: 'http://10.10.10.41:8080' }
      : { ip, marca: 'huawei', puerto: '80', responde: false, probados: ['80', '8090', '8080'], url: 'http://10.10.10.42' } })
  })
  await context.route('http://10.10.10.*/**', (route) => route.fulfill({ body: 'router' }))
  await page.goto('/admin/clientes')

  const radio = context.waitForEvent('page')
  await page.getByRole('button', { name: '10.10.10.41' }).filter({ visible: true }).click()
  const routerRadio = await radio
  await expect.poll(() => routerRadio.url()).toBe('http://10.10.10.41:8080/')

  const fibra = context.waitForEvent('page')
  await page.getByRole('button', { name: '10.10.10.42' }).filter({ visible: true }).click()
  const onu = await fibra
  await expect.poll(() => onu.url()).toBe('http://10.10.10.42/')
  await expect(page.getByText('El equipo no contestó en 80, 8090, 8080; se abre en el 80')).toBeVisible()
})

const ATENUACION_E2E = {
  umbral_db: 1.5,
  clientes: { '1': { actual: -26.6, normal: -17.7, cambio_db: -8.9, nivel: 'bajo_fuerte' } },
  grupos: [{
    tipo: 'nap', nombre: 'Caja P1-M-CN-3-A', ubicacion: [19.4326, -99.1332], medidos: 2, bajaron: 2,
    cambio_mediano_db: -7.5, peor_db: -8.9, cliente_ids: [1],
  }],
}

test('la señal que bajó contra su normal se ve en Clientes y en el mapa con las cajas que bajaron juntas', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/ftth/atenuacion', (route) => route.fulfill({ json: ATENUACION_E2E }))
  await page.route('**/api/ftth/potencias', (route) => route.fulfill({ json: { 1: { rx: -26.6, nivel: 'normal', fecha: '2026-10-13T16:05:00' } } }))
  await page.goto('/admin/clientes')

  const contador = page.getByRole('button', { name: /Señal bajó/ })
  await expect(contador).toContainText('1')
  await expect(page.getByText('▼ 8.9 dB').filter({ visible: true }).first()).toBeVisible()

  await page.goto('/admin/mapa')
  await page.getByRole('button', { name: 'Señal', exact: true }).click()
  await expect(page.getByText('Bajaron juntos')).toBeVisible()
  await page.getByRole('button', { name: /Caja P1-M-CN-3-A/ }).click()
  await expect(page.getByText('Caja NAP · bajaron 2 de 2')).toBeVisible()
})

test('al tocar la IP se abre el equipo en el puerto que contesta y la antena por el puente del MikroTik', async ({ page, context }) => {
  await authenticateAs(page)
  await mockApi(page)
  let ipConsultada = ''
  await page.route(/\/api\/clientes\/acceso-web/, async (route) => {
    ipConsultada = new URL(route.request().url()).searchParams.get('ip') || ''
    await route.fulfill({ json: { ip: ipConsultada, marca: 'zte', puerto: '8090', responde: true, probados: ['8090', '80', '8080'], url: `http://${ipConsultada}:8090` } })
  })
  await context.route(/^https?:\/\/(10\.0\.0\.\d+:8090|10\.8\.0\.4:18001)\//, (route) => route.fulfill({ body: '<title>Equipo</title>', contentType: 'text/html' }))
  await page.goto('/admin/clientes')

  const ventana = context.waitForEvent('page')
  await page.getByRole('button', { name: /^10\.0\.0\.\d+$/ }).first().click()
  const equipo = await ventana
  await expect.poll(() => equipo.url()).toMatch(/^http:\/\/10\.0\.0\.\d+:8090\/$/)
  expect(ipConsultada).toMatch(/^10\.0\.0\.\d+$/)
  await equipo.close()

  // Antena en la VLAN: el puente del MikroTik da la dirección a abrir.
  let puentes = 0
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Cliente Radio', telefono: '5550000000', direccion: 'Sagrado Corazón', ip_asignada: '10.0.0.2',
    estado: 'activo', tipo_conexion: 'radio', ip_antena: '192.168.1.20',
  } }))
  await page.route('**/api/clientes/1/acceso-antena', async (route) => {
    puentes += 1
    await route.fulfill({ json: { status: 'success', data: { ip: '192.168.1.20', router: 'MK Sagrado', puerto: 18001, url: 'http://10.8.0.4:18001', expira: '2026-10-19T15:30' } } })
  })
  if ((page.viewportSize()?.width ?? 1024) < 640) await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  const antena = context.waitForEvent('page')
  await page.getByText('192.168.1.20').click()
  const pagina = await antena
  await expect.poll(() => pagina.url()).toBe('http://10.8.0.4:18001/')
  expect(puentes).toBe(1)
  await expect(page.getByText(/Antena abierta por MK Sagrado hasta las/)).toBeVisible()
})

test('la ficha muestra el consumo por día y avisa cuando el mes no tiene registro', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Francisca De la Cruz', telefono: '5550000000', direccion: 'Paraíso', ip_asignada: '10.10.9.13', estado: 'activo',
  } }))
  const hoy = new Date()
  const esteMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  await page.route('**/api/clientes/1/consumo?**', (route) => {
    const mes = new URL(route.request().url()).searchParams.get('mes')!
    const [anio, numero] = mes.split('-').map(Number)
    const dias = Array.from({ length: new Date(anio, numero, 0).getDate() }, (_, n) => ({
      fecha: `${mes}-${String(n + 1).padStart(2, '0')}`,
      bajada: mes === esteMes && n === 0 ? 1_500_000_000 : 0,
      subida: mes === esteMes && n === 0 ? 120_000_000 : 0,
      minutos: mes === esteMes && n === 0 ? 600 : 0,
    }))
    return route.fulfill({ json: {
      mes, dias, total_bajada: mes === esteMes ? 1_500_000_000 : 0, total_subida: mes === esteMes ? 120_000_000 : 0,
      dias_con_uso: mes === esteMes ? 1 : 0, registro_desde: `${esteMes}-01`,
    } })
  })
  await page.goto('/admin/clientes')
  if ((page.viewportSize()?.width ?? 1024) < 640) await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Consumo', exact: true }).click()

  const calendario = page.getByTestId('calendario-consumo')
  await expect(calendario).toBeVisible()
  await expect(page.getByText('1.6 GB').first()).toBeVisible()
  await calendario.getByRole('button', { name: /^1(\D|$)/ }).first().click()
  await expect(page.getByText('bajó 1.5 GB y subió 120 MB; en línea 10 h.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mandar imagen al cliente' })).toBeEnabled()

  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByText(/Este mes no tiene registro: el sistema guarda el consumo desde el 1 de/)).toBeVisible()
})

test('Mi red muestra los equipos de la ONU, bloquea uno y cambia solo la contraseña del WiFi', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/api/clientes/1', (route) => route.fulfill({ json: {
    id: 1, nombre: 'Francisca De la Cruz', telefono: '5550000000', direccion: 'Paraíso', ip_asignada: '10.10.10.254', estado: 'activo',
  } }))
  await page.route('**/api/clientes/1/red', (route) => route.fulfill({ json: {
    ip: '10.10.10.254', onu: 'HWTCF1C8D69E', modelo: 'Huawei HG8145V5', tr069: true, al_dia: true,
    ultimo_reporte: new Date().toISOString(), bloqueo_disponible: true, error_bloqueo: null,
    redes: [
      { indice: 1, ssid: 'FdezNet-Casa', banda: '2.4GHz', activa: true, clave: null, conectados: 2 },
      { indice: 5, ssid: 'FdezNet-Casa', banda: '5GHz', activa: true, clave: null, conectados: 1 },
    ],
    equipos: [
      { mac: '7a:49:bf:ef:ce:78', nombre: 'Galaxy-A56-5G', ip: '192.168.100.7', conectado: true, conexion: 'wifi', red: 'FdezNet-Casa · 2.4GHz', bloqueado: false },
      { mac: '08:65:f0:5e:1f:7e', nombre: 'wlan0', ip: '192.168.100.10', conectado: false, conexion: 'wifi', red: null, bloqueado: false },
    ],
  } }))
  const bloqueos: unknown[] = []
  await page.route('**/api/clientes/1/red/bloqueo', (route) => {
    bloqueos.push(route.request().postDataJSON())
    return route.fulfill({ json: { bloqueados: ['7a:49:bf:ef:ce:78'] } })
  })
  const claves: unknown[] = []
  await page.route('**/api/clientes/1/red/clave-wifi', (route) => {
    claves.push(route.request().postDataJSON())
    return route.fulfill({ json: { aplicado: true, bandas: 2 } })
  })
  await page.goto('/admin/clientes')
  if ((page.viewportSize()?.width ?? 1024) < 640) await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Mi red', exact: true }).click()

  const lista = page.getByTestId('equipos-red')
  await expect(lista.getByText('Galaxy-A56-5G')).toBeVisible()
  await expect(page.getByText('2.4GHz y 5GHz · 3 conectados')).toBeVisible()
  await lista.getByRole('button', { name: 'Bloquear' }).first().click()
  await expect(lista.getByRole('button', { name: 'Desbloquear' })).toBeVisible()
  expect(bloqueos).toEqual([{ mac: '7a:49:bf:ef:ce:78', bloquear: true }])

  await page.getByRole('button', { name: 'Contraseña' }).click()
  await page.getByPlaceholder('Nueva contraseña (8 a 63 caracteres)').fill('nueva-clave-2026')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Contraseña de FdezNet-Casa cambiada. Los equipos se reconectan con la nueva.')).toBeVisible()
  expect(claves).toEqual([{ ssid: 'FdezNet-Casa', clave: 'nueva-clave-2026' }])
})

test('portal del cliente: entra con el contrato, crea su contraseña, ve su cuenta y reporta una falla', async ({ page }) => {
  await mockApi(page)
  let debeCambiar = true
  const enviados: Record<string, unknown[]> = { entrar: [], clave: [], falla: [] }
  await page.route('**/api/portal/entrar', (route) => {
    enviados.entrar.push(route.request().postDataJSON())
    return route.fulfill({ json: { debe_cambiar: debeCambiar } })
  })
  await page.route('**/api/portal/clave', (route) => {
    enviados.clave.push(route.request().postDataJSON())
    debeCambiar = false
    return route.fulfill({ json: { debe_cambiar: false } })
  })
  await page.route('**/api/portal/resumen', (route) => route.fulfill(debeCambiar
    ? { status: 403, json: { detail: 'Primero cambia tu contraseña.' } }
    : { json: {
      nombre: 'Francisca De la Cruz', contrato: 'F1C8', direccion: 'Paraíso', conectado: true,
      plan: { nombre: 'Hogar 20', bajada_kbps: 20480, subida_kbps: 5120, precio: 350 },
      saldo_a_favor: 0,
      cuenta: { estado_servicio: 'activo', explicacion: 'Al corriente. Próximo pago de $350.00 vence el 01/11/2026.',
        adeudos: [{ concepto: 'Noviembre 2026', monto: 350, vence: '01/11/2026', vencido: false }], promesa: null },
      pagos: [{ fecha: '2026-10-01', monto: 350, metodo: 'transferencia' }],
      datos_pago: 'Transferencia a *BBVA* con concepto F1C8', tiene_onu: true,
    } }))
  await page.route('**/api/portal/falla', (route) => {
    enviados.falla.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { id: 88 } })
  })

  await page.goto('/cliente')
  await page.getByLabel('Número de contrato').fill('f1c8')
  await page.getByLabel('Contraseña', { exact: true }).fill('F1C8')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible()
  await page.getByLabel('Contraseña nueva (mínimo 8)').fill('mi-clave-segura')
  await page.getByLabel('Repite la contraseña').fill('mi-clave-segura')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()

  await expect(page.getByRole('heading', { name: 'Hola, Francisca' })).toBeVisible()
  await expect(page.getByTestId('plan-portal')).toContainText('20 Mbps')
  await expect(page.getByText('Al corriente. Próximo pago de $350.00 vence el 01/11/2026.')).toBeVisible()
  await page.getByText('¿Cómo pago?').click()
  await expect(page.getByText('Transferencia a BBVA con concepto F1C8')).toBeVisible()
  expect(enviados.entrar).toEqual([{ contrato: 'F1C8', clave: 'F1C8' }])
  expect(enviados.clave).toEqual([{ actual: 'F1C8', nueva: 'mi-clave-segura' }])

  await page.getByRole('button', { name: 'Ayuda' }).click()
  await page.getByLabel('¿Qué pasa?').selectOption('lentitud')
  await page.getByLabel('Cuéntanos más').fill('Desde ayer en la noche va lento')
  await page.getByRole('button', { name: 'Enviar reporte' }).click()
  await expect(page.getByText('Recibimos tu reporte #88. Un técnico te contactará.')).toBeVisible()
  expect(enviados.falla).toEqual([{ categoria: 'lentitud', descripcion: 'Desde ayer en la noche va lento' }])
})
