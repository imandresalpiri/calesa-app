import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { CONTRASENA, entrar } from './soporte/alta'
import { encenderElLive, interruptorDelLive } from './soporte/live'
import { literal, sql } from './soporte/sql'

// El marco del Live (borde animado y «EN VIVO») y la ventana de cámara (docs/GLOSARIO.md › «Marco del Live», «Ventana de cámara»), con la cámara falsa de
// Chromium: el marco no recibe clics; la ventana muestra el video y los datos de quien presenta, se mueve, cambia de tamaño y se minimiza, y vuelve igual al
// recargar; elegir qué datos se ven; con `reducedMotion` el borde queda fijo; al apagar el Live no queda ni marco ni ventana y la cámara se apaga.
test.describe.configure({ mode: 'serial' })
// La ventana de cámara es de escritorio (desde 1024 px): el spec fija un navegador de escritorio para que valga igual en los dos proyectos
// (en el celular sólo se ve el marco y lo prueba `live-marco-celular`).
test.use({
  viewport: { width: 1280, height: 720 },
  isMobile: false,
  hasTouch: false,
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

let duena = ''
let redesAntes = ''
const NOMBRE = 'Dana Camara'

const ventana = (page: Page) => page.locator('[data-ventana-de-camara]:not([data-minimizada])')
const pildora = (page: Page) => page.locator('[data-ventana-de-camara][data-minimizada]')
const marco = (page: Page) => page.locator('[data-marco-del-live]')
const guardada = () =>
  sql(`select valor::text from public.preferencias_usuario where clave = 'live.ventana'`)

// Cuenta las cámaras abiertas y deja ver si sus pistas se detuvieron.
const CONTAR_CAMARAS = () => {
  const flujos: MediaStream[] = []
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
  navigator.mediaDevices.getUserMedia = async (restricciones) => {
    const flujo = await original(restricciones)
    flujos.push(flujo)
    return flujo
  }
  Object.assign(window, { __flujos: flujos })
}

async function caja(lugar: Locator) {
  const c = await lugar.boundingBox()
  if (!c) {
    throw new Error('sin caja')
  }
  return c
}

async function recargarConElLive(page: Page) {
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-camara-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE })
  sql(
    `update public.perfiles set cargo = 'Asesora de ventas', telefono = '+591 70011223' where email = ${literal(duena)}`,
  )
  redesAntes = sql(`select redes::text from public.ajustes_web where id = 1`)
  sql(
    `update public.ajustes_web set redes = '{"instagram": "https://www.instagram.com/e2elive/"}'::jsonb where id = 1`,
  )
  sql(
    `delete from public.preferencias_usuario where clave = 'live.ventana' and usuario_id = (select id from public.perfiles where email = ${literal(duena)})`,
  )
})

test.afterAll(async () => {
  sql(`update public.ajustes_web set redes = ${literal(redesAntes || '{}')}::jsonb where id = 1`)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: sin el Live no hay marco ni ventana', async ({ page }) => {
  await page.addInitScript(CONTAR_CAMARAS)
  await entrar(page, duena, { fresco: true })
  await expect(interruptorDelLive(page)).toBeVisible()
  await expect(marco(page)).toBeHidden()
  await expect(page.locator('[data-ventana-de-camara]')).toHaveCount(0)
  expect(
    await page.evaluate(() => (window as unknown as { __flujos: unknown[] }).__flujos.length),
  ).toBe(0)
})

test('E2E escritorio: con el Live aparecen el marco y «EN VIVO», sin recibir clics, y la ventana con video y datos', async ({
  page,
}) => {
  await page.addInitScript(CONTAR_CAMARAS)
  await entrar(page, duena, { fresco: true })
  await encenderElLive(page)

  await expect(marco(page)).toBeVisible()
  await expect(page.locator('[data-marco-del-live-etiqueta]')).toHaveText(/EN VIVO/)
  await expect(marco(page)).toHaveCSS('pointer-events', 'none')
  await expect(marco(page)).toHaveCSS('position', 'fixed')
  // El borde tiene su animación continua.
  expect(
    await marco(page).evaluate((el) => getComputedStyle(el, '::after').animationName),
  ).not.toBe('none')
  // Nada de la página está debajo de un clic del marco: en el borde cae lo de la app, no el marco.
  const debajo = await page.evaluate(() => {
    const e = document.elementFromPoint(document.documentElement.clientWidth - 1, 200)
    return e?.closest('[data-marco-del-live]') !== null
  })
  expect(debajo).toBe(false)

  await expect(ventana(page)).toBeVisible()
  await expect(ventana(page).getByText(NOMBRE, { exact: true })).toBeVisible()
  await expect(ventana(page).getByText('Asesora de ventas')).toBeVisible()
  await expect(ventana(page).getByText('+591 70011223')).toBeVisible()
  // El video llega de la cámara falsa.
  await expect
    .poll(() =>
      ventana(page)
        .locator('video')
        .evaluate((v: HTMLVideoElement) => v.videoWidth),
    )
    .toBeGreaterThan(0)
  await expect(ventana(page).locator('[data-camara]')).toHaveAttribute('data-camara', 'lista')
  // El video es 16:9.
  const video = await caja(ventana(page).locator('[data-camara]'))
  expect(video.width / video.height).toBeCloseTo(16 / 9, 1)
})

test('E2E escritorio: se mueve por su barra, cambia de tamaño dentro de sus topes y vuelve igual al recargar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await encenderElLive(page)
  await expect(ventana(page)).toBeVisible()

  const antes = await caja(ventana(page))
  const barra = await caja(ventana(page).locator('[data-barra-de-la-ventana]'))
  await page.mouse.move(barra.x + 40, barra.y + barra.height / 2)
  await page.mouse.down()
  await page.mouse.move(barra.x - 160, barra.y + 200, { steps: 8 })
  await page.mouse.up()
  const movida = await caja(ventana(page))
  expect(movida.x).toBeLessThan(antes.x - 100)
  expect(movida.y).toBeGreaterThan(antes.y + 100)
  expect(movida.width).toBeCloseTo(antes.width, 0)

  // La esquina que mira al centro: agrandar.
  const esquina = await caja(ventana(page).locator('[data-esquina-de-tamano]'))
  const ancho = page.viewportSize()?.width ?? 1280
  await page.mouse.move(esquina.x + esquina.width / 2, esquina.y + esquina.height / 2)
  await page.mouse.down()
  const haciaElCentro = esquina.x < ancho / 2 ? 1 : -1
  await page.mouse.move(esquina.x + haciaElCentro * 3000, esquina.y + 40, { steps: 8 })
  await page.mouse.up()
  const grande = await caja(ventana(page))
  // Tope: la mitad de la ventana del navegador.
  expect(grande.width).toBeCloseTo(Math.floor(ancho * 0.5), 0)
  expect(grande.x).toBeGreaterThanOrEqual(0)
  expect(grande.x + grande.width).toBeLessThanOrEqual(ancho)

  // Mínimo: 200 px.
  const esquina2 = await caja(ventana(page).locator('[data-esquina-de-tamano]'))
  await page.mouse.move(esquina2.x + esquina2.width / 2, esquina2.y + esquina2.height / 2)
  await page.mouse.down()
  await page.mouse.move(esquina2.x - haciaElCentro * 3000, esquina2.y, { steps: 8 })
  await page.mouse.up()
  const chica = await caja(ventana(page))
  expect(chica.width).toBeCloseTo(200, 0)

  // Se guarda (con su espera) y vuelve igual.
  await expect.poll(() => (JSON.parse(guardada() || '{}') as { ancho?: number }).ancho).toBe(200)
  await recargarConElLive(page)
  await expect(ventana(page)).toBeVisible()
  const vuelta = await caja(ventana(page))
  expect(vuelta.x).toBeCloseTo(chica.x, 0)
  expect(vuelta.y).toBeCloseTo(chica.y, 0)
  expect(vuelta.width).toBeCloseTo(200, 0)
})

test('E2E escritorio: con las flechas, enfocada, se mueve; al achicar el navegador vuelve adentro', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await encenderElLive(page)
  await expect(ventana(page)).toBeVisible()

  const antes = await caja(ventana(page))
  await ventana(page).focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await caja(ventana(page))).x).toBeCloseTo(antes.x - 16, 0)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(async () => (await caja(ventana(page))).x).toBeCloseTo(antes.x + 48, 0)

  // La ventana del navegador más chica: la de cámara no queda afuera.
  await page.setViewportSize({ width: 1100, height: 700 })
  await expect
    .poll(async () => {
      const c = await caja(ventana(page))
      return c.x >= 0 && c.y >= 0 && c.x + c.width <= 1100 && c.y + c.height <= 700
    })
    .toBe(true)
  await page.setViewportSize({ width: 1280, height: 720 })
})

test('E2E escritorio: se minimiza a una píldora, se reabre y recuerda qué datos se ven', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await encenderElLive(page)
  await expect(ventana(page)).toBeVisible()

  // Qué datos: sin el teléfono; con las redes y la web.
  await ventana(page).getByRole('button', { name: 'Ajustes de la ventana de cámara' }).click()
  const ajustes = page.locator('[data-slot="popover-content"]')
  await expect(ajustes).toBeVisible()
  // Sin logo cargado, la opción dice por qué.
  await expect(ajustes.getByText('La empresa no tiene logo cargado.')).toBeVisible()
  await ajustes.getByRole('checkbox', { name: 'WhatsApp o teléfono' }).click()
  await expect(ventana(page).getByText('+591 70011223')).toBeHidden()
  await ajustes.getByRole('checkbox', { name: 'Redes y web de la empresa' }).click()
  await expect(ventana(page).getByText('Instagram: instagram.com/e2elive')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(ajustes).toBeHidden()

  await ventana(page).getByRole('button', { name: 'Minimizar la ventana de cámara' }).click()
  await expect(pildora(page)).toHaveText(`EN VIVO · ${NOMBRE}`)
  await expect(ventana(page)).toHaveCount(0)
  await expect
    .poll(() => (JSON.parse(guardada() || '{}') as { minimizada?: boolean }).minimizada)
    .toBe(true)

  await recargarConElLive(page)
  await expect(pildora(page)).toBeVisible()
  await pildora(page).click()
  await expect(ventana(page)).toBeVisible()
  await expect(ventana(page).getByText('Instagram: instagram.com/e2elive')).toBeVisible()
  await expect(ventana(page).getByText('+591 70011223')).toBeHidden()
  await expect(ventana(page).getByText('Asesora de ventas')).toBeVisible()
  // Lo que sigue arranca con la ventana abierta: espera a que lo guardado lo diga.
  await expect
    .poll(() => (JSON.parse(guardada() || '{}') as { minimizada?: boolean }).minimizada)
    .toBe(false)
})

test('E2E escritorio: al apagar el Live no queda marco ni ventana y la cámara se apaga', async ({
  page,
}) => {
  await page.addInitScript(CONTAR_CAMARAS)
  await entrar(page, duena, { fresco: true })
  await encenderElLive(page)
  await expect(ventana(page).locator('[data-camara="lista"]')).toBeVisible()

  // Un clic en el interruptor, que queda debajo del marco, llega: el marco no los recibe.
  await interruptorDelLive(page).click()
  await expect(page.locator('html')).not.toHaveClass(/\blive\b/)
  await expect(marco(page)).toBeHidden()
  await expect(ventana(page)).toHaveCount(0)
  await expect(pildora(page)).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const flujos = (window as unknown as { __flujos: MediaStream[] }).__flujos
        return (
          flujos.length > 0 &&
          flujos.every((f) => f.getTracks().every((p) => p.readyState === 'ended'))
        )
      }),
    )
    .toBe(true)
})

test.describe('con el borde quieto', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('E2E escritorio: con movimiento reducido el borde queda fijo', async ({ page }) => {
    await entrar(page, duena, { fresco: true })
    await encenderElLive(page)
    await expect(marco(page)).toBeVisible()
    for (const parte of ['::before', '::after']) {
      expect(
        await marco(page).evaluate((el, p) => getComputedStyle(el, p).animationName, parte),
      ).toBe('none')
    }
  })
})

test.describe('sin permiso de cámara', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('negado', 'NotAllowedError'))
    })
  })

  test('E2E escritorio: la ventana muestra los datos sin video, el aviso y «Reintentar», del mismo alto', async ({
    page,
  }) => {
    await entrar(page, duena, { fresco: true })
    await encenderElLive(page)
    await expect(
      ventana(page).getByText('Sin cámara: revisa el permiso del navegador.'),
    ).toBeVisible()
    await expect(ventana(page).getByRole('button', { name: 'Reintentar' })).toBeVisible()
    await expect(ventana(page).getByText(NOMBRE, { exact: true })).toBeVisible()
    const aviso = await caja(ventana(page).locator('[data-camara]'))
    expect(aviso.width / aviso.height).toBeCloseTo(16 / 9, 1)
  })
})

test.describe('sin cámara', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('no hay', 'NotFoundError'))
    })
  })

  test('E2E escritorio: sin cámara lo dice con «Reintentar»', async ({ page }) => {
    await entrar(page, duena, { fresco: true })
    await encenderElLive(page)
    await expect(ventana(page).getByText('No se encontró una cámara.')).toBeVisible()
    await expect(ventana(page).getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })
})
