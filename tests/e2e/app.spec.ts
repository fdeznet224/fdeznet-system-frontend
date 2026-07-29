import { expect, test, type Page } from '@playwright/test'

async function authenticateAs(
  page: Page,
  role: 'admin' | 'supervisor' | 'tecnico' | 'cajero' = 'admin',
) {
  await page.addInitScript((selectedRole) => {
    localStorage.setItem('token', 'e2e-token')
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      usuario: `${selectedRole}-e2e`,
      nombre_completo: 'Usuario E2E',
      rol: selectedRole,
    }))
  }, role)
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
    } else if (url.pathname.endsWith('/whatsapp/no-leidos')) {
      body = {}
    } else if (url.pathname.endsWith('/whatsapp/chat/1')) {
      body = []
    } else if (url.pathname.endsWith('/whatsapp/configuracion')) {
      body = { intervalo_default: 60 }
    } else if (url.pathname.endsWith('/whatsapp/status')) {
      body = { connected: false, qr: null, active: false }
    } else if (url.pathname.endsWith('/configuracion/plantillas-facturacion')) {
      body = []
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
    } else if (url.pathname.endsWith('/configuracion/sistema')) {
      body = {
        id: 1,
        activar_corte_automatico: true,
        activar_notificaciones: true,
        aviso_pantalla_corte: false,
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
        resumen_clientes: { total_registrados: 1, online_activos: 1, offline_cortados: 0, retirados: 0 },
        metricas: { total_clientes: 1, navegando_ok: 1, falla_tecnica: 0, morosos_online: 0, morosos_offline: 0 },
        finanzas: { cobrado_hoy: 0, cobrado_mes: 0, moneda: 'MXN' },
        ultimos_pagos: [],
        servidor: { cpu_percent: 5, ram_total_gb: 8, ram_usada_percent: 20, disco_libre_percent: 80 },
      }
    } else if (url.pathname.endsWith('/dashboard/clientes-online-detalle')) {
      body = { metricas: { total_clientes: 1, navegando_ok: 1, falla_tecnica: 0, morosos_online: 0, morosos_offline: 0 } }
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
      body = { detalles: [] }
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
      body = { id: 1, nombre: 'Cliente E2E', telefono: '5550000000', ip_asignada: '10.0.0.2', estado: 'activo' }
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

  await expect(page.getByRole('heading', { name: 'Bajas y recuperación' })).toBeVisible()
})

test('ofrece recuperación cuando falla un módulo diferido', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.route('**/assets/ServiceTerminations-*.js', (route) => route.abort())
  await page.goto('/admin/bajas')

  await expect(page.getByRole('heading', { name: 'No pudimos cargar esta pantalla' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar aplicación' })).toBeVisible()
})

test('carga el panel técnico tipado', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/dashboard')

  await expect(page.getByText('FdezNet Tech')).toBeVisible()
  await expect(page.getByText('Buscar o escanear QR...')).toBeVisible()
})

test('carga el radar OLT activo con una API vacía', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/radar')

  await expect(page.getByRole('heading', { name: 'Radar OLT / Fibra' })).toBeVisible()
  await expect(page.locator('.olt-empty:visible')).toHaveText('Sin resultados.')
})

test('carga el panel principal con sus contratos tipados', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible()
  await expect(page.getByText('Resumen de Red')).toBeVisible()
})

test('abre herramientas y alta desde el listado unificado', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/clientes')

  await expect(page.getByText('Gestión de Clientes')).toBeVisible()
  await page.getByRole('button', { name: 'Herramientas de Cliente E2E' }).click()
  const toolsDialog = page.getByRole('dialog', { name: 'Herramientas del cliente' })
  await expect(toolsDialog.getByText('10.0.0.2', { exact: true })).toBeVisible()
  await expect(toolsDialog.getByText('Activo', { exact: true })).toBeVisible()
  await toolsDialog.getByRole('button', { name: /^Mensaje/ }).click()
  const chatDialog = page.getByRole('dialog', { name: 'Chat con Cliente E2E' })
  await expect(chatDialog.getByPlaceholder('Escribe un mensaje...')).toBeVisible()
  await chatDialog.getByRole('button', { name: 'Cerrar chat' }).click()
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

test('el supervisor entra a clientes y no ve inventario', async ({ page }) => {
  await authenticateAs(page, 'supervisor')
  await mockApi(page)
  await page.goto('/admin/clientes')

  await expect(page).toHaveURL(/\/admin\/clientes$/)
  await expect(page.getByText('Gestión de Clientes')).toBeVisible()
  if ((page.viewportSize()?.width ?? 1024) < 768) {
    await page.locator('header button').first().click()
  }
  await page.getByRole('button', { name: 'Operaciones' }).click()
  await expect(page.getByText('Órdenes / Instalaciones')).toBeVisible()
  await expect(page.getByText('Bajas / Recuperación')).toBeVisible()
  await expect(page.getByText('Inventario / Bodega')).toHaveCount(0)
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
  await expect(page.getByText('Terminal POS')).toBeVisible()
  await page.getByPlaceholder('Ej. Juan Perez...').fill('Cliente')
  await expect(page.getByText('Cliente E2E', { exact: true })).toBeVisible()
})

test('carga el inventario con un equipo disponible', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/inventario')

  await expect(page.getByRole('heading', { name: 'Bodega e Inventario' })).toBeVisible()
  await expect(page.locator('span:visible').filter({ hasText: /^ONU-STOCK-E2E$/ }).first()).toBeVisible()
  await expect(page.locator('span:visible').filter({ hasText: /^BODEGA$/ }).first()).toBeVisible()
})

test('abre una conversación desde el CRM', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/mensajes')

  await page.getByText('Cliente E2E', { exact: true }).first().click()
  await expect(page.getByPlaceholder('Escribe un mensaje')).toBeVisible()
  await expect(page.getByText('🟢 ACTIVO', { exact: true })).toBeVisible()
})

test('carga el detalle técnico completo de un cliente', async ({ page }) => {
  await authenticateAs(page, 'tecnico')
  await mockApi(page)
  await page.goto('/tech/cliente/TECH-1')

  await expect(page.getByText('Cliente Técnico E2E')).toBeVisible()
  await expect(page.getByText('NAP E2E')).toBeVisible()
  await expect(page.getByText('-22.50 dBm')).toBeVisible()
})

test('busca un cliente desde el encabezado global', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/dashboard')

  await page.getByPlaceholder('Buscar cliente por nombre...').fill('Cliente')
  await expect(page.getByText('Cliente Global E2E')).toBeVisible()
})

test('carga facturas y su resumen financiero', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/facturas')

  await expect(page.getByRole('heading', { name: 'Gestión Financiera' })).toBeVisible()
  await expect(page.locator(':is(div, h3):visible').filter({ hasText: /^Factura E2E$/ }).first()).toBeVisible()
  await expect(page.getByText('Pendiente (1)')).toBeVisible()
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

  await expect(page.getByRole('heading', { name: /Ordenes de Servicio/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva Orden' })).toBeVisible()
})

test('carga las transacciones y sus filtros financieros', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/transacciones')

  await expect(page.getByRole('heading', { name: 'Transacciones y Caja' })).toBeVisible()
  await expect(page.getByText('Total en Pantalla')).toBeVisible()
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

test('carga la administración de zonas', async ({ page }) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/configuracion/zonas')

  await expect(page.getByRole('heading', { name: 'Gestión de Zonas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear Zona' })).toBeVisible()
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
  await expect(page.getByText('SN: E2E-1')).toBeVisible()
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
