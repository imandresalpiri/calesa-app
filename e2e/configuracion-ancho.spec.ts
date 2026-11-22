import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'

// Configuración y Perfil no tienen tope de ancho: el contenido llega al borde derecho del área y las tarjetas se reparten en más columnas
// cuando hay lugar (columnas de ≈ 20 rem). Con el texto al 200 % queda una columna; en 375 px no hay desplazamiento de costado.

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-ancho-config-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Ana Ancho' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

const PAGINAS = [
  '/configuracion/empresa',
  '/configuracion/leads',
  '/configuracion/origenes',
  '/configuracion/web/ajustes',
  '/configuracion/cola-web',
  '/perfil',
]
const CON_TABLERO = [
  '/configuracion/empresa',
  '/configuracion/leads',
  '/configuracion/web/ajustes',
  '/perfil',
]

// El borde derecho de lo más ancho que dibuja la página, contra el del área de contenido (`<main>` sin su relleno).
async function medir(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main#contenido') as HTMLElement
    const estilo = getComputedStyle(main)
    const area = main.getBoundingClientRect().right - parseFloat(estilo.paddingRight)
    const derechos = [...main.querySelectorAll('[role="group"], ul, table, section')].map(
      (e) => e.getBoundingClientRect().right,
    )
    return { area, contenido: Math.max(...derechos) }
  })
}

// Cuántas columnas de tarjetas hay: las posiciones distintas de la izquierda de las tarjetas del tablero.
async function columnas(page: Page) {
  return page.evaluate(() => {
    const tarjetas = document.querySelectorAll('main#contenido [role="group"] > div > *')
    return new Set([...tarjetas].map((t) => Math.round(t.getBoundingClientRect().left))).size
  })
}

test('E2E sin tope de ancho: el contenido llega al borde del área y hay más columnas que en 1280', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  for (const ruta of PAGINAS) {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(ruta)
    await expect(page.locator('main#contenido h1').first()).toBeVisible()
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
    const { area, contenido } = await medir(page)
    expect(
      Math.abs(area - contenido),
      `${ruta}: el contenido llega al borde del área`,
    ).toBeLessThanOrEqual(1)
    if (CON_TABLERO.includes(ruta)) {
      const anchas = await columnas(page)
      await page.setViewportSize({ width: 1280, height: 900 })
      expect(await columnas(page), `${ruta}: más columnas en 1920 que en 1280`).toBeLessThan(anchas)
    }
  }
})

test('E2E una sola tarjeta en 2560 px no se estira a todo el ancho', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'mide 2560 px')
  await entrar(page, duena, { fresco: true })
  await page.setViewportSize({ width: 2560, height: 1080 })
  await page.goto('/perfil')
  const tarjeta = page.locator('main#contenido [role="group"] > div > *').first()
  await expect(tarjeta).toBeVisible()
  const ancho = (await tarjeta.boundingBox())?.width ?? 0
  expect(ancho).toBeLessThan(2560 / 2)
})

test('E2E en 375 px no hay desplazamiento de costado', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.setViewportSize({ width: 375, height: 800 })
  for (const ruta of PAGINAS) {
    await page.goto(ruta)
    await expect(page.locator('main#contenido h1').first()).toBeVisible()
    await sinScrollHorizontal(page)
  }
})

test('E2E con el texto al 200 % las tarjetas van en una columna', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'mide 1280 px')
  await textoGrandeAlCargar(page)
  await entrar(page, duena, { fresco: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const ruta of CON_TABLERO) {
    await page.goto(ruta)
    await expect(page.locator('main#contenido h1').first()).toBeVisible()
    expect(await columnas(page), ruta).toBe(1)
    await sinScrollHorizontal(page)
  }
})
