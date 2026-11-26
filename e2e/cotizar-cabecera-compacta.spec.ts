import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { publicarFormulaConAvanzado } from './soporte/cotizar-avanzado'
import { escribirElTitulo } from './soporte/cotizar-titulo'
import {
  esperarElTotal,
  limpiarGuardado,
  prepararGuardado,
  regionDelTotal,
  tipearEnLaHoja,
  totalDeLaHoja,
} from './soporte/cotizar-guardar'
import { esMovil } from './soporte/inventario'
import { capturar, tactil } from './soporte/recorrido'

// La hoja de cotizar compacta (`docs/UX.md` › «Cotizar»; `docs/DECISIONES.md` › «La hoja sin el resumen de la derecha»): la cabecera de la hoja (los modos y «Ver total
// en moneda local») va en la fila de las barras del vehículo y del cliente (glosario: «Ranura de la cabecera»), el total encima de «Avanzado», «Guardar» debajo y a todo
// el ancho, el Modo Live sólo en la barra de arriba, y nada salta al hidratar ni al recalcular. El origen de prueba tiene dos modos y una sección avanzada.

test.describe.configure({ mode: 'serial' })

let duena = ''
let lead = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'compacta', true))
  publicarFormulaConAvanzado(origen.id, true)
})

test.afterAll(async () => {
  await limpiarGuardado()
})

// Lo que se mide en cada cuadro desde que la página empieza a dibujarse: el borde de arriba (en la página, no en la ventana) de la hoja, de «Avanzado» y del cierre.
const MEDIDOS = ['[data-hoja]', '[data-avanzado]', '[data-cierre-de-la-hoja]'] as const

async function medirCadaCuadro(page: Page): Promise<void> {
  await page.addInitScript((selectores: readonly string[]) => {
    const muestras: Record<string, number[]> = {}
    for (const s of selectores) muestras[s] = []
    Object.assign(window, { __muestras: muestras })
    const medir = () => {
      for (const s of selectores) {
        const caja = document.querySelector(s)?.getBoundingClientRect()
        if (caja && caja.height > 0) {
          const lista = muestras[s]
          const y = Math.round((caja.top + window.scrollY) * 10) / 10
          if (lista && lista.at(-1) !== y) lista.push(y)
        }
      }
      requestAnimationFrame(medir)
    }
    requestAnimationFrame(medir)
  }, MEDIDOS)
}

const muestras = (page: Page) =>
  page.evaluate(() => (window as unknown as { __muestras: Record<string, number[]> }).__muestras)

// Cada lugar medido estuvo siempre en el mismo alto de la página: lo que llega al hidratar (la cabecera por el portal) o al recalcular (los avisos del total) no lo movió.
async function nadaSalto(page: Page, cuando: string): Promise<void> {
  const m = await muestras(page)
  for (const s of MEDIDOS) {
    expect(m[s]?.length, `${s} no se dibujó (${cuando})`).toBeGreaterThan(0)
    expect(m[s], `${s} se movió (${cuando})`).toHaveLength(1)
  }
}

const ir = async (page: Page) => {
  await entrar(page, duena, { fresco: true })
  await medirCadaCuadro(page)
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(ranura(page).locator('[data-cabecera]')).toBeVisible()
}
const fila = (page: Page) => page.locator('[data-cabecera-de-la-hoja]')
const ranura = (page: Page) => page.locator('[data-ranura-de-la-cabecera]')
const caja = async (lugar: Locator) => {
  const c = await lugar.boundingBox()
  expect(c, 'sin caja').not.toBeNull()
  return c ?? { x: 0, y: 0, width: 0, height: 0 }
}

test('la cabecera va en la fila de las barras: una línea a 1440 px y dos filas en el celular, con blancos de 44 px', async ({
  page,
}, info) => {
  if (!esMovil(page)) await page.setViewportSize({ width: 1440, height: 900 })
  await ir(page)
  const barras = fila(page).locator(':scope > div')
  const vehiculo = await caja(barras.nth(0))
  const cliente = await caja(barras.nth(1))
  const cabecera = await caja(ranura(page))
  // Las dos barras, siempre lado a lado.
  expect(Math.abs(vehiculo.y - cliente.y)).toBeLessThanOrEqual(1)
  if (esMovil(page)) {
    // En el celular la cabecera es la segunda fila, a todo el ancho.
    expect(cabecera.y).toBeGreaterThanOrEqual(vehiculo.y + vehiculo.height - 1)
    for (const objetivo of await ranura(page).locator('label').all()) {
      await tactil(page, objetivo)
    }
  } else {
    // A 1440 px, una sola línea: la cabecera a la derecha de las barras y a su misma altura.
    expect(cabecera.x).toBeGreaterThanOrEqual(cliente.x + cliente.width - 1)
    expect(cabecera.y).toBeLessThan(vehiculo.y + vehiculo.height)
    expect(vehiculo.y).toBeLessThan(cabecera.y + cabecera.height)
  }
  info.annotations.push({
    type: 'alto de la fila de las barras',
    description: `${String(Math.round((await caja(fila(page))).height))} px`,
  })
  await capturar(page, info, 'cabecera-compacta')
})

test('el total va encima de «Avanzado» y «Guardar» debajo, a todo el ancho; el Modo Live sólo está en la barra de arriba', async ({
  page,
}) => {
  await ir(page)
  await escribirElTitulo(page)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00', { timeout: 15_000 })
  const total = await caja(regionDelTotal(page))
  const avanzado = await caja(page.locator('[data-avanzado]'))
  const guardar = page.locator('[data-cierre-de-la-hoja]').getByRole('button', {
    name: 'Guardar',
    exact: true,
  })
  const boton = await caja(guardar)
  const secciones = await caja(page.locator('[data-secciones]'))
  expect(total.y + total.height).toBeLessThanOrEqual(avanzado.y + 1)
  expect(boton.y).toBeGreaterThanOrEqual(avanzado.y + avanzado.height - 1)
  // A todo el ancho de las secciones (con su relleno).
  expect(boton.width).toBeGreaterThan(secciones.width * 0.9)
  await expect(page.locator('[data-hoja]').getByRole('button', { name: /Modo Live/ })).toHaveCount(
    0,
  )
  await expect(page.getByRole('button', { name: /^Modo Live/ })).toHaveCount(1)
})

test('nada salta al hidratar ni al recalcular', async ({ page }) => {
  await ir(page)
  await esperarElTotal(page)
  await nadaSalto(page, 'al hidratar')
  await escribirElTitulo(page)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await tipearEnLaHoja(page, 'pub', '1300')
  await expect(totalDeLaHoja(page)).toContainText('1.305,00', { timeout: 15_000 })
  await esperarElTotal(page)
  await nadaSalto(page, 'al recalcular')
})
