import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { celdaDeLaHoja } from './soporte/cotizar-guardar'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { PRECIO_CON_EL_HUECO, publicarLaHojaEnLaRejilla } from './soporte/hoja-en-rejilla'
import { capturar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { sql } from './soporte/sql'

// La hoja de cotizar en la rejilla libre (docs/UX.md › «Flujo 2 — Cotizar», 3; docs/GLOSARIO.md › «Posición (en la rejilla)» y «Orden de lectura»), en los dos
// proyectos: el hueco que deja el editor (`configuracion-hoja-rejilla-libre.spec.ts`, el mismo diseño de `soporte/hoja-en-rejilla.ts`) se respeta a 1.920 px; a
// 412 px las piezas se apilan en orden de lectura y, al 200 %, nada se encima ni desplaza la página de costado; la subasta sembrada (un diseño de antes, que se
// convierte al leerlo) dibuja «Avanzado» entre «Aduana» y «Garantía», con sus secciones de 6 columnas de a dos por fila.
test.describe.configure({ mode: 'serial' })

let duena = ''
let hoja = { id: '', nombre: '' }
let subasta = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-hoja-rejilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Hilda Hueco' })
  hoja = await crearOrigenDeCotizar(proyecto, 'hrejilla', false)
  publicarLaHojaEnLaRejilla(hoja.id, PRECIO_CON_EL_HUECO)
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const ESCRITORIO = { width: 1920, height: 1080 }
const CELULAR = { width: 412, height: 915 }
// Un píxel de redondeo entre cajas que se tocan.
const UN_PIXEL = 1

type Caja = { nombre: string; x: number; y: number; ancho: number; alto: number }

async function abrir(page: Page, origenId: string) {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

const secciones = (page: Page) => page.locator('[data-secciones]')
const seccion = (page: Page, id: string) => secciones(page).locator(`[data-seccion="${id}"]`)
// Las piezas de una sección: los hijos de su rejilla de celdas, en el orden del DOM.
const piezasDe = (lugar: Locator) => lugar.locator(':scope > div > [data-nodo]')
// Las secciones principales y el bloque «Avanzado», en el orden del DOM.
const lugaresDeLaHoja = (page: Page) =>
  secciones(page).locator(
    ':scope > div > [data-seccion], :scope > div > [data-bloque-del-avanzado]',
  )

// Las cajas de lo que hay en `lista`, con su nombre (el nodo, la sección o «avanzado»), en el orden del DOM.
const cajasDe = (lista: Locator): Promise<Caja[]> =>
  lista.evaluateAll((es) =>
    es.map((e) => {
      const r = e.getBoundingClientRect()
      const nombre = e.getAttribute('data-nodo') ?? e.getAttribute('data-seccion') ?? 'avanzado'
      return { nombre, x: r.x, y: r.y, ancho: r.width, alto: r.height }
    }),
  )

async function cajaDe(lugar: Locator): Promise<Caja> {
  const [caja] = await cajasDe(lugar)
  if (caja === undefined) throw new Error('no está')
  return caja
}

// Los pares de cajas que se encima más de un píxel.
function encimadas(cajas: readonly Caja[]): string[] {
  const seEncima = (a: Caja, b: Caja) =>
    Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x) > UN_PIXEL &&
    Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y) > UN_PIXEL
  return cajas.flatMap((a, i) =>
    cajas.slice(i + 1).flatMap((b) => (seEncima(a, b) ? [`${a.nombre} y ${b.nombre}`] : [])),
  )
}

// Cada caja empieza donde termina la anterior o más abajo: apiladas en ese orden.
function apiladas(cajas: readonly Caja[]): boolean {
  return cajas.every((c, i) => {
    const anterior = cajas[i - 1]
    return anterior === undefined || c.y >= anterior.y + anterior.alto - UN_PIXEL
  })
}

test('R1: a 1.920 px «Precio» empieza en la mitad de «Base» y ninguna pieza ocupa la mitad izquierda de su fila', async ({
  page,
}, info) => {
  await page.setViewportSize(ESCRITORIO)
  await abrir(page, hoja.id)
  const base = seccion(page, 'base')
  const rejilla = await cajaDe(base.locator(':scope > div'))
  const precio = await cajaDe(base.locator('[data-nodo="precio"]'))
  const mitad = rejilla.x + rejilla.ancho / 2
  expect(precio.x).toBeGreaterThanOrEqual(mitad - UN_PIXEL)
  expect(Math.abs(precio.x + precio.ancho - (rejilla.x + rejilla.ancho))).toBeLessThan(2)
  // Lo demás de «Base» va debajo de la fila de «Precio» o a su derecha: la mitad izquierda, libre.
  const otras = (await cajasDe(piezasDe(base))).filter((c) => c.nombre !== 'precio')
  expect(otras.map((c) => c.nombre)).toEqual(['flete'])
  for (const c of otras) {
    expect(c.y >= precio.y + precio.alto - UN_PIXEL || c.x >= mitad - UN_PIXEL, c.nombre).toBe(true)
  }
  await capturar(page, info, 'hueco-1920')
})

test('R5: a 412 px las piezas se apilan en orden de lectura y, al 200 %, nada se encima ni desplaza de costado', async ({
  page,
}, info) => {
  await page.setViewportSize(CELULAR)
  await abrir(page, hoja.id)
  const base = seccion(page, 'base')
  // «Precio» (columna 7, fila 1) se lee antes que «Flete» (columna 1, fila 2): primero en el DOM y arriba.
  const piezas = await cajasDe(piezasDe(base))
  expect(piezas.map((c) => c.nombre)).toEqual(['precio', 'flete'])
  expect(apiladas(piezas)).toBe(true)
  expect(apiladas(await cajasDe(lugaresDeLaHoja(page)))).toBe(true)
  await capturar(page, info, 'celular-412')

  await textoGrandeAlCargar(page)
  await page.reload()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await sinScrollHorizontal(page)
  expect(encimadas(await cajasDe(lugaresDeLaHoja(page)))).toEqual([])
  for (const id of ['base', 'extras', 'resumen']) {
    expect(encimadas(await cajasDe(piezasDe(seccion(page, id)))), id).toEqual([])
  }
  await capturar(page, info, 'celular-200')
})

test('R6: la subasta sembrada, un diseño de antes, a 1.920 px: «Avanzado» entre «Aduana» y «Garantía» y las secciones de 6 columnas de a dos; a 412 px, apiladas', async ({
  page,
}, info) => {
  await page.setViewportSize(ESCRITORIO)
  await abrir(page, subasta)
  await celdaDeLaHoja(page, 'mostrar_garantia').getByRole('switch').click()
  await expect(seccion(page, 'garantia')).toBeVisible()
  const orden = ['hoja', 'cambio', 'compra', 'logistica', 'aduana', 'avanzado', 'garantia']
  const lugares = await cajasDe(lugaresDeLaHoja(page))
  expect(lugares.map((c) => c.nombre)).toEqual(orden)
  const rejilla = await cajaDe(secciones(page).locator(':scope > div'))
  const mitad = rejilla.x + rejilla.ancho / 2
  const de = (nombre: string): Caja => {
    const caja = lugares.find((c) => c.nombre === nombre)
    if (caja === undefined) throw new Error(`no está ${nombre}`)
    return caja
  }
  // Las principales, «Automáticas»: la mitad de la rejilla, a la izquierda o a la derecha; el bloque, la fila entera.
  for (const c of lugares.filter((l) => l.nombre !== 'avanzado')) {
    expect(Math.abs(c.ancho / rejilla.ancho - 0.5), c.nombre).toBeLessThan(0.03)
  }
  for (const nombre of ['cambio', 'logistica']) expect(de(nombre).x).toBeGreaterThan(mitad)
  for (const nombre of ['hoja', 'compra', 'aduana', 'garantia']) {
    expect(Math.abs(de(nombre).x - rejilla.x), nombre).toBeLessThan(2)
  }
  expect(Math.abs(de('avanzado').ancho - rejilla.ancho)).toBeLessThan(2)
  expect(apiladas([de('aduana'), de('avanzado'), de('garantia')])).toBe(true)
  expect(encimadas(lugares)).toEqual([])
  await capturar(page, info, 'subasta-1920')

  await page.setViewportSize(CELULAR)
  await expect.poll(async () => apiladas(await cajasDe(lugaresDeLaHoja(page)))).toBe(true)
  expect((await cajasDe(lugaresDeLaHoja(page))).map((c) => c.nombre)).toEqual(orden)
  await capturar(page, info, 'subasta-412')
})
