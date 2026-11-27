import { expect, test, type Page } from './soporte/prueba'
import type { PlantillaEnCuadricula } from '../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import {
  MAXIMO_DE_COLUMNAS,
  MAXIMO_DE_FILAS,
  TOPE_EN_BYTES_DE_LA_CUADRICULA,
} from '../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import { bytesComoJsonb } from '../src/modules/cotizaciones/entities/json-de-la-base'
import { entrar } from './soporte/alta'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  abrirElPanel,
  crearConfiguradoraDeTarjeta,
  limpiarTerrenoDePlantilla,
  prepararTerrenoDePlantilla,
  sembrarBorradorDePlantilla,
} from './soporte/plantilla'
import { publicarLaMiniConMiembros } from './soporte/plantilla-volumen'
import { borrarPersonasDePrueba, borrarRolesDePrueba } from './soporte/base'
import { abrirLaFormula, urlDeLaFormula } from './soporte/rutas-de-la-formula'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve un aviso y la tarjeta en sólo lectura

// La pestaña «Tarjeta» con volumen (T325): el primer HTML no lleva lo que el editor no dibuja (un nodo restringido que la plantilla no nombra); con 500 miembros y la
// cuadrícula más grande que admite la forma 2 (16 × 120 y todas las celdas que entran en 24 KiB: 1.000 no caben) se miden el primer HTML y los nodos del DOM, y una
// posición vacía del lienzo es un solo nodo sin hijos; con 600 miembros, «Dato» dibuja 50 y halla el que falta al escribir.
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 500 miembros y la cuadrícula más grande (267.903 B y 4.135 nodos con el build de `.next-e2e`), con margen: va a
// docs/RENDIMIENTO.md. Crece contra el editor de bloques (183.947 B): el contexto reducido lleva todos los nodos del nivel «todos» y la cuadrícula viaja entera; y
// la página del origen suma su marco (migas, encabezado, pestañas y la barra de la fórmula), fijo: no crece con los miembros ni con la cuadrícula.
// La puesta en marcha suma un chunk que nombra cada referencia de cliente del payload, y el grupo `(pestanas)`.
const TOPE_DE_BYTES_DEL_HTML = 280_700
const TOPE_DE_NODOS_CON_500 = 5_000

let configuradora = ''
let mini = { id: '', nombre: '' }
let con500 = { id: '', nombre: '' }
let con600 = { id: '', nombre: '' }

// 16 columnas de 100 px y 120 filas de 16 px; una celda de texto por casilla, en orden de lectura, mientras el texto del jsonb no pase de 24 KiB.
function laMasGrandeQueEntra(): PlantillaEnCuadricula {
  const columnas = Array.from({ length: MAXIMO_DE_COLUMNAS }, (_, i) => ({
    id: `k${String(i + 1)}`,
    ancho: 100,
  }))
  const filas = Array.from({ length: MAXIMO_DE_FILAS }, (_, i) => ({
    id: `f${String(i + 1)}`,
    alto: 16,
    ocultar_si: 'nunca' as const,
  }))
  const plantilla: {
    forma: 2
    columnas: typeof columnas
    filas: typeof filas
    celdas: PlantillaEnCuadricula['celdas'][number][]
  } = {
    forma: 2,
    columnas,
    filas,
    celdas: [],
  }
  for (const f of filas) {
    for (const c of columnas) {
      const celda = {
        id: `c${String(plantilla.celdas.length + 1)}`,
        fila: f.id,
        columna: c.id,
        contenido: { tipo: 'texto' as const, texto: 'x' },
      }
      plantilla.celdas.push(celda)
      if (bytesComoJsonb(plantilla) > TOPE_EN_BYTES_DE_LA_CUADRICULA) {
        plantilla.celdas.pop()
        return plantilla
      }
    }
  }
  return plantilla
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(240_000)
  const proyecto = info.project.name
  const terreno = await prepararTerrenoDePlantilla(proyecto, 'tarjvol')
  mini = { id: terreno.origenId, nombre: '' }
  con500 = await crearOrigenDeCotizar(proyecto, 'tarjv500', false)
  publicarLaMiniConMiembros(con500.id, 500)
  sembrarBorradorDePlantilla(con500.id, laMasGrandeQueEntra())
  con600 = await crearOrigenDeCotizar(proyecto, 'tarjv600', false)
  publicarLaMiniConMiembros(con600.id, 600)
  configuradora = await crearConfiguradoraDeTarjeta(proyecto, 'tarjvol', [
    mini.id,
    con500.id,
    con600.id,
  ])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrir(page: Page, id: string) {
  await abrirLaFormula(page, id, 'tarjeta')
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Lienzo de la tarjeta' })).toBeVisible()
}

test('E7: el primer HTML no lleva un nodo restringido que la plantilla no nombra, y sí la descripción de un nodo del nivel «todos»', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  const respuesta = await page.request.get(urlDeLaFormula(mini.id, 'tarjeta'))
  expect(respuesta.ok()).toBe(true)
  const html = await respuesta.text()
  // El valor CIF es de «costos» y la plantilla no lo nombra: no viaja. La descripción de un nodo del nivel «todos» sí (el selector de «Dato» la ofrece).
  expect(html).not.toContain('Valor CIF')
  expect(html).toContain('Probabilidad de compra en subasta')
})

test('E7: con 500 miembros y la cuadrícula más grande se miden los bytes del primer HTML y los nodos; una casilla vacía no tiene hijos', async ({
  page,
}, info) => {
  await entrar(page, configuradora, { fresco: true })
  const respuesta = await page.request.get(urlDeLaFormula(con500.id, 'tarjeta'))
  const bytes = Buffer.byteLength(await respuesta.text())
  await abrir(page, con500.id)
  const lienzo = page.getByRole('grid', { name: 'Lienzo de la tarjeta' })
  await expect(lienzo.locator('[data-pos="119:15"]')).toBeAttached()
  const { nodos, vacias, conHijos, celdas } = await page.evaluate(() => {
    const vaciasDelLienzo = [...document.querySelectorAll('[role="gridcell"]:not([aria-label])')]
    return {
      nodos: document.querySelectorAll('*').length,
      vacias: vaciasDelLienzo.length,
      conHijos: vaciasDelLienzo.filter((c) => c.childNodes.length > 0).length,
      celdas: document.querySelectorAll('[data-tarjeta-de-cotizacion] [data-celda]').length,
    }
  })
  // El JS en frío de la ruta (con el build de `.next-e2e`; el editor llega después por `diferido()`): se anota, la ruta no tiene presupuesto.
  const js = await medirJsEnFrio(page.context(), urlDeLaFormula(con500.id, 'tarjeta'))
  const medido = `${String(bytes)} B, ${String(nodos)} nodos (${String(celdas)} celdas, ${String(vacias)} casillas vacías), JS en frío ${String(enKB(js.bytes))} KB gz en ${String(js.chunks)} chunks`
  info.annotations.push({ type: 'medido', description: medido })
  console.warn(
    `[medido] primer HTML de la pestaña «Tarjeta» con 500 miembros y la cuadrícula más grande: ${medido}`,
  )
  expect(celdas).toBeGreaterThan(100)
  expect(vacias).toBe(MAXIMO_DE_FILAS * MAXIMO_DE_COLUMNAS - celdas)
  expect(conHijos).toBe(0)
  expect(bytes).toBeLessThan(TOPE_DE_BYTES_DEL_HTML)
  expect(nodos).toBeLessThan(TOPE_DE_NODOS_CON_500)
})

test('E7: con 600 miembros, «Dato» dibuja a lo sumo 50 y halla al que falta al escribir', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrir(page, con600.id)
  const lienzo = page.getByRole('grid', { name: 'Lienzo de la tarjeta' })
  await lienzo.locator('[data-pos="0:0"]').click()
  const panel = await abrirElPanel(page, 'Celda')
  await panel.getByRole('radio', { name: 'Dato' }).click()
  await expect(panel.getByText('Escribe para acotar.')).toBeVisible()
  await expect(panel.locator('[data-nodo-para-elegir="miembro_600"]')).toHaveCount(0)
  await panel.getByLabel('Buscar un dato').fill('miembro 600')
  await expect(panel.locator('[data-nodo-para-elegir="miembro_600"]')).toBeVisible()
  await expect(panel.getByText('Escribe para acotar.')).toHaveCount(0)
})
