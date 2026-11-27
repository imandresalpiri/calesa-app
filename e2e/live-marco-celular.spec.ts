import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { CONTRASENA, entrar } from './soporte/alta'
import { encenderElLive } from './soporte/live'

// En una pantalla angosta (celular y tableta vertical, menos de 1024 px) el Live sólo muestra el marco: no hay ventana de cámara ni se pide la cámara.
// El ancho se fija acá para que valga igual en los dos proyectos.
test.use({ viewport: { width: 600, height: 900 } })

let duena = ''
const marco = (page: Page) => page.locator('[data-marco-del-live]')

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-marco-${info.project.name}`)
  await crearDuenaDePrueba({
    email: duena,
    contrasena: CONTRASENA,
    nombre: 'Marta Marco',
  })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E: en pantalla angosta el Live muestra el marco y no la ventana de cámara', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { __pedidos: 0 })
    navigator.mediaDevices.getUserMedia = () => {
      ;(window as unknown as { __pedidos: number }).__pedidos += 1
      return Promise.reject(new DOMException('no', 'NotAllowedError'))
    }
  })
  await entrar(page, duena, { fresco: true })
  await expect(marco(page)).toBeHidden()
  await encenderElLive(page)
  await expect(marco(page)).toBeVisible()
  await expect(page.locator('[data-marco-del-live-etiqueta]')).toHaveText(/EN VIVO/)
  await expect(marco(page)).toHaveCSS('pointer-events', 'none')
  await expect(page.locator('[data-ventana-de-camara]')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __pedidos: number }).__pedidos)).toBe(0)
})
