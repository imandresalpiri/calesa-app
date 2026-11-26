import { expect, test, type Locator, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import { arrastrarEnElLienzo } from './soporte/arrastre-del-lienzo'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElPdf } from './soporte/cotizar-pdf'
import {
  borrarTonoDePrueba,
  crearTonoDePrueba,
  leerElBorradorDelDiseno,
  publicarElBorradorDelDiseno,
  publicarFormulaDeTresSumandos,
  publicarLaVersionConAspecto,
} from './soporte/diseno-editor'
import { capturar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// La rejilla de la hoja (docs/UX.md › «Cotización: hoja (estados propios)»; docs/GLOSARIO.md › «Aspecto» y «Rejilla de la hoja»): en el editor, una sección
// movida una celda con Alt+flechas, el ancho de una sección y de una celda a 8 de 12 en el lugar que quedó libre, una celda arrastrada a una fila libre (la que
// deja queda vacía), la densidad compacta y un tono en una sección, en vivo en el lienzo (la hoja a 1.280 px), y el borrador que pasa la validación de la base
// al publicarse. Una cotización de una versión con ese aspecto lo dibuja; una de la versión vieja se ve como siempre, y el PDF no
// cambia. El editor (Configuración) va sólo en escritorio; la hoja, en los dos proyectos, sobre un segundo origen con las dos versiones sembradas.
test.describe.configure({ mode: 'serial' })

let duena = ''
let tono = ''
let editor = { id: '', nombre: '' }
let hoja = { id: '', nombre: '' }
let deLaV1 = ''
let deLaV2 = ''

const laDeLaVersion = (origenId: string, version: number) =>
  sql(`
    select c.id from public.cotizaciones c join public.formulas f on f.id = c.formula_id
     where c.origen_id = ${literal(origenId)}::uuid and f.version = ${String(version)}
     order by c.creado_en desc, c.id desc limit 1`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  tono = `e2e_grilla_${proyecto}`
  borrarTonoDePrueba(tono)
  crearTonoDePrueba(tono)
  duena = correoDePrueba(`duena-grilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Greta Grilla' })
  editor = await crearOrigenDeCotizar(proyecto, 'dgrilla', false)
  publicarFormulaDeTresSumandos(editor.id)
  // El origen de la hoja: una cotización de la v1 (sin aspecto) y otra de la v2 (con el aspecto que arma el editor).
  hoja = await crearOrigenDeCotizar(proyecto, 'dgrillahoja', false)
  publicarFormulaDeTresSumandos(hoja.id)
  sembrarCotizaciones({ origenId: hoja.id, creadoPor: idDePersona(duena), cuantas: 1 })
  deLaV1 = laDeLaVersion(hoja.id, 1)
  publicarLaVersionConAspecto(hoja.id, tono)
  sembrarCotizaciones({ origenId: hoja.id, creadoPor: idDePersona(duena), cuantas: 1 })
  deLaV2 = laDeLaVersion(hoja.id, 2)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarTonoDePrueba(tono)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lienzo = (page: Page) => page.locator('[data-lienzo-de-la-hoja]')
const seccionDelEditor = (page: Page, id: string) =>
  lienzo(page).locator(`section[data-seccion="${id}"]`)
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const boton = (page: Page, pieza: string) => page.locator(`[data-elegir="${pieza}"]`)
const nodosDe = (lista: Locator, atributo: string) =>
  lista.evaluateAll((nodos, a) => nodos.map((n) => n.getAttribute(a)), atributo)
const idsDe = (lista: Locator) => nodosDe(lista, 'data-seccion')
const ordenDelEditor = (page: Page) => idsDe(lienzo(page).locator('section[data-seccion]'))
const ordenDe = (lugar: Locator) => idsDe(lugar.locator('[data-secciones] [data-seccion]'))

// Elige una pieza en el lienzo; una sección, por su título (el centro cae sobre sus piezas).
async function elegir(page: Page, pieza: string) {
  await boton(page, pieza).click(pieza.startsWith('seccion-') ? { position: { x: 24, y: 6 } } : {})
  await expect(inspector(page)).toHaveAttribute('data-pieza', pieza)
}

// La celda (la XCell) de un nodo: su relleno, su fondo y su tramo en la rejilla de su sección.
async function celda(lugar: Locator, nodo: string) {
  return lugar.locator(`[data-nodo="${nodo}"]`).evaluate((envoltura) => {
    const xcell = envoltura.firstElementChild as HTMLElement
    const estilo = getComputedStyle(xcell)
    const rejilla = envoltura.parentElement as HTMLElement
    return {
      tramo: getComputedStyle(envoltura).gridColumnEnd,
      relleno: estilo.paddingTop,
      fondo: estilo.backgroundColor,
      proporcion: envoltura.getBoundingClientRect().width / rejilla.getBoundingClientRect().width,
    }
  })
}

// El ancho de una sección en rem y si sus celdas van en una sola columna.
async function medidaDeLaSeccion(lugar: Locator, id: string) {
  return lugar.locator(`[data-seccion="${id}"]`).evaluate((s) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const izquierdas = [...s.querySelectorAll('[data-nodo]')].map((n) =>
      Math.round(n.getBoundingClientRect().left),
    )
    return {
      rem: s.getBoundingClientRect().width / rem,
      unaColumna: new Set(izquierdas).size === 1,
    }
  })
}

// El aspecto de la sección elegida, a la vista en el inspector: llevarlo a la vista.
const abrirElAspecto = (page: Page) =>
  inspector(page).locator('[data-aspecto-de-la-seccion]').scrollIntoViewIfNeeded()

// Mueve una sección una celda con el teclado: elegida, Alt+flecha sobre ella (el foco vuelve a la sección movida).
async function moverConElTeclado(page: Page, id: string, flecha: string) {
  await elegir(page, `seccion-${id}`)
  await page.keyboard.press(`Alt+${flecha}`)
  await expect(boton(page, `seccion-${id}`)).toBeFocused()
}

// La XCell de un nodo (el primer hijo de su lugar en la rejilla).
const xcellDe = (lugar: Locator, nodo: string) => lugar.locator(`[data-nodo="${nodo}"] > *`).first()

const FONDO_DEL_TONO = 'rgb(255, 247, 214)'

// @sin-celular: el editor del diseño es una pantalla de Configuración; en el celular el camino feliz va sólo en escritorio (e2e.md).
test('G1: mover con el teclado y arrastrando a un lugar libre, el ancho de 8 de 12, la densidad y el tono se ven en vivo y el borrador se publica', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaFormula(page, editor.id, 'hoja', 'vista=1280')
  await enLaPestana(page, 'Hoja')
  await expect(lienzo(page)).toHaveAttribute('data-vista', '1280')

  // «Extras» baja una fila con el teclado (Alt+↓, una celda): la mitad derecha de la primera queda libre y nada más se mueve.
  await moverConElTeclado(page, 'extras', 'ArrowDown')
  await expect(page.locator('[data-anuncio-de-la-hoja]')).toHaveText(
    'Moviste la sección «Extras» a la columna 7, fila 2.',
  )
  await expect.poll(() => ordenDelEditor(page)).toEqual(['base', 'resumen', 'extras'])

  // «Base» a lo ancho (12 columnas), en el lugar que dejó «Extras», y «Precio» en 8 de 12.
  const base = seccionDelEditor(page, 'base')
  await elegir(page, 'seccion-base')
  await abrirElAspecto(page)
  await inspector(page).getByLabel('Ancho en la hoja').selectOption('12')
  await elegir(page, 'precio')
  await inspector(page).getByLabel('Ancho', { exact: true }).selectOption('8')

  // Arrastrar «Precio» a la fila del «+», debajo de «Flete»: nada se mueve mientras se arrastra, la marca dice que el lugar está libre y, al soltar, la
  // primera fila queda vacía (nada se corre solo).
  await arrastrarEnElLienzo(page, 'precio', base.locator('[data-hueco-para-sumar]'), {
    marca: 'libre',
  })
  await expect
    .poll(() => nodosDe(base.locator('[data-rejilla-de-celdas] > [data-pieza]'), 'data-pieza'))
    .toEqual(['flete', 'precio'])
  await expect(page.locator('[data-anuncio-de-la-hoja]')).toHaveText(
    'Moviste «Precio» a la columna 1, fila 3.',
  )

  // «Base» compacta y con el tono.
  await elegir(page, 'seccion-base')
  await abrirElAspecto(page)
  await inspector(page).getByLabel('Densidad').selectOption('compacta')
  await inspector(page)
    .getByLabel('Color')
    .selectOption({ label: `E2E ${tono}` })

  // El lienzo a 1.280 px dibuja todo sin guardar: el orden, «Precio» en 8 de 12, el tono y las celdas compactas (4 px de relleno) con su fondo.
  await expect.poll(() => ordenDe(lienzo(page))).toEqual(['base', 'resumen', 'extras'])
  await expect(base.locator('[data-pieza="precio"]')).toHaveCSS('grid-column-end', 'span 8')
  await expect(base).toHaveAttribute('data-tono', tono)
  await expect(xcellDe(base, 'precio')).toHaveCSS('padding-top', '4px')
  await expect(xcellDe(base, 'precio')).toHaveCSS('background-color', FONDO_DEL_TONO)

  // Guardar el borrador: queda el aspecto y cada lugar (con la fila vacía), y la base lo valida entero al publicarlo.
  await page.getByRole('button', { name: 'Guardar el borrador', exact: true }).click()
  await expect(page.locator('[data-guardado] [role="status"]')).toHaveText('Se guardó el borrador.')
  const borrador = leerElBorradorDelDiseno(editor.id)
  expect(borrador?.diseno.secciones.map((s) => [s.id, s.posicion])).toEqual([
    ['base', { columna: 1, fila: 1 }],
    ['resumen', { columna: 1, fila: 2 }],
    ['extras', { columna: 7, fila: 2 }],
  ])
  const enLaBase = borrador?.diseno.secciones.find((s) => s.id === 'base')
  expect(enLaBase).toMatchObject({ ancho: 12, densidad: 'compacta', tono })
  expect(enLaBase?.items.map((i) => [i.nodo, i.posicion])).toEqual([
    ['flete', { columna: 1, fila: 2 }],
    ['precio', { columna: 1, fila: 3 }],
  ])
  expect(enLaBase?.items.find((i) => i.nodo === 'precio')?.ancho).toBe(8)
  publicarElBorradorDelDiseno(editor.id)
  expect(
    sql(
      `select version from public.formulas where origen_id = ${literal(editor.id)}::uuid and estado = 'publicada'`,
    ),
  ).toBe('2')
})

test('G2: una cotización de la versión con aspecto lo dibuja: el orden, el tono, la densidad y el ancho de 8 de 12, también al 200 %', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${deLaV2}`)
  const principal = page.locator('main')
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  expect(await ordenDe(principal)).toEqual(['resumen', 'base', 'extras'])
  await expect(principal.locator('[data-seccion="base"]')).toHaveAttribute('data-tono', tono)
  const precio = await celda(principal, 'precio')
  expect(precio.relleno).toBe('4px')
  expect(precio.fondo).toBe(FONDO_DEL_TONO)
  // 8 de 12 si la sección le da 16 rem (mide 32 o más); si no, la fila entera.
  const medida = await medidaDeLaSeccion(principal, 'base')
  expect(precio.tramo).toBe(medida.rem >= 32 ? 'span 8' : 'span 12')
  await capturar(page, info, 'diseno-grilla-guardada-v2')

  await textoGrandeAlCargar(page)
  await page.reload()
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  await sinScrollHorizontal(page)
  const alDoble = await medidaDeLaSeccion(principal, 'base')
  if (alDoble.rem < 32) expect(alDoble.unaColumna).toBe(true)
  else expect((await celda(principal, 'precio')).tramo).toBe('span 8')
  await capturar(page, info, 'diseno-grilla-guardada-v2-200')
})

test('G3: una cotización de la versión vieja se ve igual: su orden, las celdas a lo ancho, sin tono y con el relleno de siempre', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${deLaV1}`)
  const principal = page.locator('main')
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  expect(await ordenDe(principal)).toEqual(['base', 'extras', 'resumen'])
  await expect(principal.locator('[data-secciones] [data-seccion][data-tono]')).toHaveCount(0)
  for (const nodo of ['precio', 'flete', 'aduana']) {
    const c = await celda(principal, nodo)
    expect(c.tramo, nodo).toBe('span 12')
    expect(c.relleno, nodo).toBe('8px')
  }
  await capturar(page, info, 'diseno-grilla-guardada-v1')
})

// @sin-celular: el PDF se arma en el servidor con su plantilla y no depende del ancho, del proyecto ni del tacto.
test('G4: el PDF de la versión con aspecto tiene las mismas líneas que el de la vieja, salvo el número y la fecha', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const sinNumeroNiFecha = (lineas: string[]) =>
    lineas.filter((l) => !/n\.º|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(l))
  const v1 = await leerElPdf(page, deLaV1)
  const v2 = await leerElPdf(page, deLaV2)
  expect(sinNumeroNiFecha(v2.lineas)).toEqual(sinNumeroNiFecha(v1.lineas))
})
