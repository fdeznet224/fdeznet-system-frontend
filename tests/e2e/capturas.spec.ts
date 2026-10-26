// Capturas de pantalla para revisar el diseño (no es parte de la liberación).
import { test } from '@playwright/test'

import { authenticateAs, mockApi } from './helpers'

const DESTINO = process.env.CAPTURAS_DIR || 'test-results/capturas'
const PANTALLAS: Array<[string, string]> = (process.env.CAPTURAS || '/admin/dashboard,/admin/clientes').split(',').map((ruta) => [ruta, ruta.replace(/\W+/g, '_')])

test.skip(!process.env.CAPTURAS_DIR, 'solo a mano')

test('login', async ({ page }, info) => {
  await page.goto('/login')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DESTINO}/${info.project.name}-login.png`, fullPage: true })
})

for (const [ruta, nombre] of PANTALLAS) {
  test(`captura ${ruta}`, async ({ page }, info) => {
    await authenticateAs(page)
    await mockApi(page)
    await page.goto(ruta)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${DESTINO}/${info.project.name}${nombre}.png`, fullPage: false })
  })
}

test('menú más y buscador', async ({ page }, info) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/clientes')
  await page.waitForTimeout(800)
  if (info.project.name === 'mobile-chrome') {
    await page.getByRole('link', { name: 'Más', exact: true }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DESTINO}/${info.project.name}-mas.png` })
    await page.keyboard.press('Escape')
  }
  await page.keyboard.press('Control+k')
  await page.getByRole('searchbox', { name: 'Buscar cliente o sección' }).fill('Cliente')
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${DESTINO}/${info.project.name}-buscador.png` })
})

test('modo oscuro', async ({ page }, info) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.addInitScript(() => localStorage.setItem('tema-elegido', 'dark'))
  for (const ruta of (process.env.CAPTURAS || '/admin/dashboard').split(',')) {
    await page.goto(ruta)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${DESTINO}/${info.project.name}-oscuro${ruta.replace(/\W+/g, '_')}.png` })
  }
})

test('ficha y herramientas del cliente', async ({ page }, info) => {
  await authenticateAs(page)
  await mockApi(page)
  await page.goto('/admin/clientes')
  await page.waitForTimeout(800)
  if (info.project.name === 'mobile-chrome') await page.locator('article').first().click()
  else await page.locator('tbody tr').first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${DESTINO}/${info.project.name}-ficha.png` })
  for (const pestana of ['Servicios', 'Red', 'Finanzas']) {
    const boton = page.getByRole('button', { name: pestana, exact: true }).last()
    if (await boton.count()) {
      await boton.click()
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${DESTINO}/${info.project.name}-ficha-${pestana}.png` })
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Herramientas de Cliente E2E' }).filter({ visible: true }).first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${DESTINO}/${info.project.name}-herramientas.png` })
})
