import { test } from '@playwright/test'
import { authenticateAs, mockApi } from './helpers'
test.skip(!process.env.CAPTURAS_DIR, 'solo a mano')
for (const ruta of ['/admin/configuracion/almacenamiento', '/admin/configuracion/bot-whatsapp']) {
  test(`errores ${ruta}`, async ({ page }) => {
    page.on('pageerror', (e) => console.log('PAGEERROR', ruta, e.message)); page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', ruta, m.text().slice(0, 300)) })
    await authenticateAs(page)
    await mockApi(page)
    await page.goto(ruta)
    await page.waitForTimeout(1500)
  })
}
