import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  celdaDeLaHoja,
  escribirEnLaHoja,
  limpiarGuardado,
  prepararGuardado,
  tipearEnLaHoja,
} from './soporte/cotizar-guardar'
import { capturar } from './soporte/recorrido'
import { sql } from './soporte/sql'

// La hoja de cotizar con el aspecto de las capturas de V1 (`docs/UX.md` › «Flujo 2 — Cotizar», 3 y 4; `docs/DECISIONES.md` › «La hoja con el aspecto de V1»):
// la XCell (rótulo · valor · acciones, el candado con su globo), los chips en píldora, el interruptor sin caja, la tarjeta del total, «Avanzado» y sus secciones
// sin marco. Sobre la subasta sembrada, como la dueña (ve todos los niveles). Lo que se juzga mirando va en capturas (sólo con `E2E_CAPTURAS`).
test.describe.configure({ mode: 'serial' })

let duena = ''
let subasta = ''

const MOTIVO_DE_LA_CUENTA = 'Se habilita con «Cuenta especial USA».'

test.beforeAll(async ({}, info) => {
  ;({ duena } = await prepararGuardado(info.project.name, 'aspectov1'))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  await limpiarGuardado()
})

async function abrir(page: Page): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

const xcell = (page: Page, nodo: string) => celdaDeLaHoja(page, nodo).locator('[data-xcell]')
const lado = (page: Page, nodo: string, parada: number) =>
  celdaDeLaHoja(page, nodo).locator(`[data-parada="${String(parada)}"]`)
const estilo = (lugar: Locator, propiedad: string, pseudo?: string) =>
  lugar.evaluate((e, [p, s]) => getComputedStyle(e, s).getPropertyValue(p), [
    propiedad,
    pseudo ?? null,
  ] as const)
const enPx = async (lugar: Locator, propiedad: string) =>
  Number.parseFloat(await estilo(lugar, propiedad))
// El color de un token, como lo resuelve el navegador (rgb), para compararlo con un `background-color`.
const colorDelToken = (page: Page, token: string) =>
  page.evaluate((t) => {
    const prueba = document.createElement('div')
    prueba.style.backgroundColor = `var(${t})`
    document.body.append(prueba)
    const color = getComputedStyle(prueba).backgroundColor
    prueba.remove()
    return color
  }, token)
const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Avanzado' })
const abrirAvanzado = async (page: Page) => {
  await page
    .locator('[data-avanzado]')
    .getByRole('button', { name: /^Avanzado/ })
    .click()
  await expect(dialogo(page)).toBeVisible()
}

test('la XCell: rótulo a la izquierda, el monto grande en monoespaciada, el % chico, las acciones en orden y el candado con su globo', async ({
  page,
}) => {
  await abrir(page)
  await tipearEnLaHoja(page, 'remate', '5000')
  const rotulo = xcell(page, 'remate').locator('[title]').first()
  const monto = lado(page, 'remate', 0)
  expect((await rotulo.boundingBox())?.x ?? 0).toBeLessThan((await monto.boundingBox())?.x ?? 0)
  expect(await estilo(monto, 'font-family')).toMatch(/mono/i)
  expect(await enPx(monto, 'font-weight')).toBeGreaterThanOrEqual(700)
  // «Fees»: el monto y su % chico al lado.
  expect(await enPx(lado(page, 'fees', 1), 'font-size')).toBeLessThan(
    await enPx(lado(page, 'fees', 0), 'font-size'),
  )
  // En cada celda las acciones van candado · ⚙ · ayuda · ↺ (paradas 10 a 13, en el orden del DOM).
  const ordenes = await page
    .locator('[data-hoja] [data-xcell]')
    .evaluateAll((celdas) =>
      celdas.map((c) =>
        [...c.querySelectorAll('[data-parada]')]
          .map((e) => Number(e.getAttribute('data-parada')))
          .filter((n) => n >= 10),
      ),
    )
  for (const orden of ordenes) expect(orden).toEqual([...orden].sort((a, b) => a - b))
  await expect(
    page.getByRole('button', { name: /^Cambiar el valor por defecto de / }).first(),
  ).toBeVisible()
  await expect(
    celdaDeLaHoja(page, 'transporte_bolivia').getByRole('button', { name: /^Ayuda de / }),
  ).toBeVisible()
  // «Cuenta especial» con el interruptor apagado: el candado con su motivo (nombre del icono, descripción del valor y globo al tocarlo).
  const candado = celdaDeLaHoja(page, 'cuenta_especial').getByRole('img', {
    name: MOTIVO_DE_LA_CUENTA,
  })
  await expect(candado).toBeVisible()
  await expect(lado(page, 'cuenta_especial', 0)).toHaveAccessibleDescription(MOTIVO_DE_LA_CUENTA)
  // El clic pasa el puntero y lo enfoca (en el celular, sin `:hover`, el toque lo enfoca): las dos muestran el globo.
  await candado.click()
  await expect.poll(() => estilo(candado, 'display', '::after')).not.toBe('none')
})

test('los chips son píldoras con la elegida rellena; el interruptor va sin caja, con el switch a la izquierda, y habilita su celda', async ({
  page,
}) => {
  await abrir(page)
  const primario = await colorDelToken(page, '--color-primario')
  const elegido = page.locator('label', { hasText: /^Auto gasolina$/ })
  const otro = page.locator('label', { hasText: /^Moto$/ })
  expect(await enPx(elegido, 'border-top-left-radius')).toBeGreaterThan(100)
  expect(await estilo(elegido, 'background-color')).toBe(primario)
  expect(await estilo(otro, 'background-color')).not.toBe(primario)

  const interruptor = page.locator('[data-slot="interruptor"]', { hasText: 'Cuenta especial USA' })
  const conmutador = interruptor.getByRole('switch', { name: 'Cuenta especial USA' })
  expect(await enPx(interruptor, 'border-top-width')).toBe(0)
  expect((await conmutador.boundingBox())?.x ?? 0).toBeLessThan(
    (await interruptor.getByText('Cuenta especial USA', { exact: true }).boundingBox())?.x ?? 0,
  )
  await conmutador.click()
  await expect
    .poll(() =>
      celdaDeLaHoja(page, 'cuenta_especial')
        .getByRole('img', { name: MOTIVO_DE_LA_CUENTA })
        .count(),
    )
    .toBe(0)

  // Los años del modal, igual: el pulsado relleno.
  await abrirAvanzado(page)
  const anio = dialogo(page)
    .getByRole('list', { name: /^Atajos de / })
    .getByRole('button')
    .first()
  await anio.click()
  await expect(anio).toHaveAttribute('aria-pressed', 'true')
  expect(await enPx(anio, 'border-top-left-radius')).toBeGreaterThan(100)
  expect(await estilo(anio, 'background-color')).toBe(primario)
})

test('la tarjeta del total: superficie invertida, el rótulo en mayúsculas y la cifra sin moneda con Live', async ({
  page,
}) => {
  await abrir(page)
  const tarjeta = page.locator('[data-tarjeta-del-total]')
  await expect(tarjeta.locator('[data-total]')).toBeVisible()
  expect(await estilo(tarjeta, 'background-color')).toBe(await colorDelToken(page, '--color-ink'))
  expect(await estilo(tarjeta.locator('span').first(), 'text-transform')).toBe('uppercase')
  // El Modo Live sólo está en la barra de arriba: la hoja no lleva otro botón.
  const live = page.getByRole('button', { name: /^Modo Live/ })
  await expect(live).toHaveCount(1)
  await live.click()
  await expect(tarjeta.locator('[data-total] [data-monto-valor]')).toBeHidden()
  await expect(tarjeta.locator('[data-total] [data-monto-sin-moneda]')).toBeVisible()
  await expect(tarjeta.locator('[data-total] [data-monto-sin-moneda]')).toHaveText(/^-?[\d.,\s]+$/)
  await live.click()
})

test('«Avanzado»: el botón a lo ancho y el modal con sus secciones sin marco, las franjas en monoespaciada y los tercios en una fila', async ({
  page,
}, info) => {
  await abrir(page)
  const boton = page.locator('[data-avanzado]')
  const ancho = (await page.locator('[data-seccion="compra"]').boundingBox())?.width ?? 0
  expect(Math.abs(((await boton.boundingBox())?.width ?? 0) - ancho)).toBeLessThanOrEqual(1)
  await abrirAvanzado(page)
  for (const seccion of ['cif', 'poliza']) {
    const marco = dialogo(page).locator(`[data-seccion="${seccion}"]`)
    await expect(marco).toBeVisible()
    expect(await enPx(marco, 'border-top-width')).toBe(0)
    expect(await estilo(marco.locator('h2'), 'text-transform')).toBe('uppercase')
  }
  for (const franja of ['Valor CIF', 'Total gastos']) {
    const valor = dialogo(page)
      .getByText(franja, { exact: true })
      .locator('xpath=following-sibling::*[1]')
    expect(await estilo(valor, 'font-family')).toMatch(/mono/i)
  }
  test.skip(info.project.name === 'movil', 'Los tercios van a una columna en el celular.')
  const filas = await Promise.all(
    ['gasto_puerto', 'gasto_taller', 'utilidad'].map(async (n) =>
      Math.round((await dialogo(page).locator(`[data-nodo="${n}"]`).boundingBox())?.y ?? -1),
    ),
  )
  expect(new Set(filas).size).toBe(1)
})

test('editar en el lugar: la caja no se mueve; Enter confirma, Tab confirma y pasa a la siguiente, Esc cancela', async ({
  page,
}) => {
  await abrir(page)
  const celda = xcell(page, 'remate')
  // A la vista antes de medir: el clic no desplaza la página y la caja se compara en el mismo lugar.
  await celda.scrollIntoViewIfNeeded()
  const antes = await celda.boundingBox()
  const entrada = await escribirEnLaHoja(page, 'remate', '')
  const abierta = await celda.boundingBox()
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs((abierta?.[k] ?? 0) - (antes?.[k] ?? 0)), k).toBeLessThanOrEqual(0.5)
  }
  await entrada.fill('4200')
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
  await expect(lado(page, 'remate', 0)).toContainText('4.200')
  await expect(lado(page, 'remate', 0)).toBeFocused()

  await escribirEnLaHoja(page, 'remate', '4300')
  await page.keyboard.press('Tab')
  await expect(lado(page, 'remate', 0)).toContainText('4.300')
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.activeElement?.closest('[data-nodo]')?.getAttribute('data-nodo'),
      ),
    )
    .not.toBe('remate')

  await escribirEnLaHoja(page, 'remate', '9999')
  await page.keyboard.press('Escape')
  await expect(lado(page, 'remate', 0)).toContainText('4.300')
})

test('el alto: la celda mide 56 px en el escritorio; en el celular, cada botón, candado y chip mide 44 × 44', async ({
  page,
}, info) => {
  await abrir(page)
  if (info.project.name !== 'movil') {
    expect(
      Math.abs(((await xcell(page, 'remate').boundingBox())?.height ?? 0) - 56),
    ).toBeLessThanOrEqual(2)
    return
  }
  const chicos = await page
    .locator('[data-hoja] [data-xcell] [data-parada], [data-hoja] fieldset label')
    .evaluateAll((es) =>
      es
        .map((e) => ({
          que: e.getAttribute('aria-label') ?? e.textContent,
          caja: e.getBoundingClientRect(),
        }))
        .filter(({ caja }) => caja.width > 0 && (caja.width < 43.5 || caja.height < 43.5))
        .map(({ que }) => que),
    )
  expect(chicos).toEqual([])
})

test('capturas: la hoja y el modal, en claro y en oscuro, a 1280 y 1440 px (y en el celular)', async ({
  page,
}, info) => {
  test.skip(!process.env['E2E_CAPTURAS'], 'Sólo para el recorrido de la IA.')
  await abrir(page)
  const anchos = info.project.name === 'movil' ? [null] : [1280, 1440]
  for (const tema of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: tema })
    for (const ancho of anchos) {
      if (ancho !== null) await page.setViewportSize({ width: ancho, height: 1000 })
      const nombre = `${ancho === null ? 'celular' : String(ancho)}-${tema === 'light' ? 'claro' : 'oscuro'}`
      await capturar(page, info, `hoja-${nombre}`)
      await abrirAvanzado(page)
      await capturar(page, info, `avanzado-${nombre}`)
      await page.keyboard.press('Escape')
      await expect(dialogo(page)).toBeHidden()
    }
  }
})
