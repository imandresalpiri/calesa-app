// @sin-celular-archivo: el editor de la hoja es de Configuración y pide al menos 1.024 px; lo que dibuja la hoja en el celular va en cotizar-hoja-rejilla-libre.
import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import { arrastrarEnElLienzo, arrastrarHastaElLugar } from './soporte/arrastre-del-lienzo'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElBorradorDelDiseno, publicarElBorradorDelDiseno } from './soporte/diseno-editor'
import {
  disenoEnLaRejilla,
  PRECIO_A_LA_IZQUIERDA,
  PRECIO_CON_EL_HUECO,
  publicarLaHojaEnLaRejilla,
} from './soporte/hoja-en-rejilla'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// La rejilla libre en el editor de la hoja (docs/UX.md › «Cotización: hoja (estados propios)»; docs/GLOSARIO.md › «Posición (en la rejilla)» y «Lugar libre (de la
// rejilla)»), en la vista «Grande»: «Precio» llevado a la columna 7 de su fila deja libre la mitad izquierda (el hueco se guarda y la base lo publica); soltar
// «Flete» sobre «Precio» no empuja a nadie; el alto crece en filas con Alt+Shift+↓ y con el borde inferior; el «Ancho» del inspector no mueve a las vecinas y
// apaga con su motivo la columna en la que se pisaría con otra. Ninguna prueba mide cajas: el lugar de cada pieza se lee de su estilo en línea y de sus clases.
// Lo que la hoja dibuja con ese diseño, en escritorio y en el celular, va en `cotizar-hoja-rejilla-libre.spec.ts`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let editor = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-rejilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Rejilla' })
  editor = await crearOrigenDeCotizar(proyecto, 'drejilla', false)
  publicarLaHojaEnLaRejilla(editor.id, PRECIO_A_LA_IZQUIERDA)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lienzo = (page: Page) => page.locator('[data-lienzo-de-la-hoja]')
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const boton = (page: Page, pieza: string) => page.locator(`[data-elegir="${pieza}"]`)
const lugar = (page: Page, pieza: string) => lienzo(page).locator(`[data-pieza="${pieza}"]`)
const anuncio = (page: Page) => page.locator('[data-anuncio-de-la-hoja]')
const campo = (page: Page, etiqueta: string) =>
  inspector(page).getByLabel(etiqueta, { exact: true })

async function abrirElEditor(page: Page) {
  await entrar(page, duena, { fresco: true })
  await abrirLaFormula(page, editor.id, 'hoja', 'vista=1920')
  await enLaPestana(page, 'Hoja')
  await expect(lienzo(page)).toHaveAttribute('data-vista', '1920')
}

async function elegir(page: Page, pieza: string) {
  await boton(page, pieza).click()
  await expect(inspector(page)).toHaveAttribute('data-pieza', pieza)
}

async function guardarElBorrador(page: Page) {
  await page.getByRole('button', { name: 'Guardar el borrador', exact: true }).click()
  await expect(page.locator('[data-guardado] [role="status"]')).toHaveText('Se guardó el borrador.')
}

// El lugar de cada pieza del lienzo como lo escribe el editor: su columna, fila y alto (las variables del estilo en línea) y su ancho (las clases `col-span`).
// No mide: dos lecturas iguales son el mismo lugar en la rejilla. Las de `row-span` no cuentan: su prefijo es el corte de la sección, que se corre con el ancho
// de la más angosta (docs/GLOSARIO.md › «Rejilla de la hoja»).
const lugaresEnElLienzo = (page: Page) =>
  lienzo(page)
    .locator('[data-pieza]')
    .evaluateAll((piezas) =>
      Object.fromEntries(
        piezas.map((p) => [
          p.getAttribute('data-pieza') ?? '',
          `${(p.getAttribute('style') ?? '').replaceAll(/\s+/g, '')} ${(
            p.getAttribute('class') ?? ''
          )
            .split(/\s+/)
            .filter((c) => c.includes('col-span-'))
            .join(' ')}`,
        ]),
      ),
    )
const sinLa = (lugares: Record<string, string>, pieza: string) =>
  Object.fromEntries(Object.entries(lugares).filter(([p]) => p !== pieza))

const itemsDeLaBase = (origenId: string) =>
  leerElBorradorDelDiseno(origenId)?.diseno.secciones.find((s) => s.id === 'base')?.items ?? []

test('R1: «Precio» a la columna 7 de su fila deja libre la mitad izquierda: el borrador guarda el hueco y la base lo publica', async ({
  page,
}, info) => {
  await abrirElEditor(page)
  await capturar(page, info, 'antes')
  await elegir(page, 'precio')
  const antes = await lugaresEnElLienzo(page)
  await arrastrarHastaElLugar(page, 'precio', 'Columna 7, fila 1', () =>
    capturar(page, info, 'marca-libre'),
  )
  await expect(anuncio(page)).toHaveText('Moviste «Precio» a la columna 7, fila 1.')
  await expect(campo(page, 'Columna')).toHaveValue('7')
  await expect(lugar(page, 'precio')).toHaveAttribute('style', /--pieza-columna: ?7(;|$)/)
  // Tailwind pone `col-span-6` (la forma abreviada) antes que `col-start-(--pieza-columna)`: si no, el ancho borraría la columna.
  await expect(lugar(page, 'precio')).toHaveCSS('grid-column-start', '7')
  // Nada más se corrió: «Flete» sigue debajo, en la columna 1.
  expect(sinLa(await lugaresEnElLienzo(page), 'precio')).toEqual(sinLa(antes, 'precio'))
  await capturar(page, info, 'hueco')

  await guardarElBorrador(page)
  await page.reload()
  await expect(campo(page, 'Columna')).toHaveValue('7')
  expect(itemsDeLaBase(editor.id).map((i) => [i.nodo, i.posicion, i.ancho])).toEqual([
    ['precio', PRECIO_CON_EL_HUECO, 6],
    ['flete', { columna: 1, fila: 2 }, 6],
  ])
  // Es el diseño que dibuja la hoja de cotizar-hoja-rejilla-libre, y la base lo valida entero al publicarlo.
  expect(leerElBorradorDelDiseno(editor.id)?.diseno.secciones).toEqual(
    disenoEnLaRejilla(PRECIO_CON_EL_HUECO).secciones,
  )
  publicarElBorradorDelDiseno(editor.id)
  expect(
    sql(
      `select version from public.formulas where origen_id = ${literal(editor.id)}::uuid and estado = 'publicada'`,
    ),
  ).toBe('2')
})

test('R2: soltar «Flete» sobre «Precio» no empuja: la marca dice que ahí está y ninguna pieza cambia de lugar', async ({
  page,
}, info) => {
  await abrirElEditor(page)
  await elegir(page, 'flete')
  const antes = await lugaresEnElLienzo(page)
  await arrastrarEnElLienzo(page, 'flete', boton(page, 'precio'), {
    marca: 'pisa',
    antesDeSoltar: async () => {
      await expect(page.locator('[data-marca-de-soltar="pisa"]')).toHaveText('Ahí está «Precio».')
      await capturar(page, info, 'marca-pisa')
    },
  })
  await expect(anuncio(page)).toHaveText('No se movió: ahí está «Precio».')
  expect(await lugaresEnElLienzo(page)).toEqual(antes)
})

test('R3: el alto en filas: Alt+Shift+↓ da 2 y el borde inferior llevado a la fila libre, 3; las vecinas no se mueven', async ({
  page,
}) => {
  await abrirElEditor(page)
  await elegir(page, 'precio')
  const vecinas = sinLa(await lugaresEnElLienzo(page), 'precio')
  await expect(campo(page, 'Alto')).toHaveValue('1')
  await boton(page, 'precio').focus()
  await page.keyboard.press('Alt+Shift+ArrowDown')
  await expect(campo(page, 'Alto')).toHaveValue('2')
  // El borde inferior hasta el «+» de «Base», en la fila que sigue: una más.
  const borde = page.locator('[data-borde-del-tamano="inferior"]')
  await expect(borde).toHaveAccessibleName('Alto de «Precio»: 2 filas')
  const hueco = lienzo(page).locator('section[data-seccion="base"] [data-hueco-para-sumar]')
  await borde.dragTo(hueco, { steps: 10, force: true })
  await expect(campo(page, 'Alto')).toHaveValue('3')
  await expect(lugar(page, 'precio')).toHaveAttribute('style', /--pieza-alto: ?3(;|$)/)
  expect(sinLa(await lugaresEnElLienzo(page), 'precio')).toEqual(vecinas)
  await guardarElBorrador(page)
  expect(itemsDeLaBase(editor.id).find((i) => i.nodo === 'precio')?.alto).toBe(3)
})

test('R4: el «Ancho» del inspector no mueve a las vecinas, y la columna en la que se pisaría con «Precio» va apagada con su motivo', async ({
  page,
}, info) => {
  await abrirElEditor(page)
  await elegir(page, 'flete')
  const vecinas = sinLa(await lugaresEnElLienzo(page), 'flete')
  await expect(campo(page, 'Ancho')).toHaveValue('6')
  await campo(page, 'Ancho').selectOption('4')
  await expect(lugar(page, 'flete')).toHaveCSS('grid-column-end', 'span 4')
  expect(sinLa(await lugaresEnElLienzo(page), 'flete')).toEqual(vecinas)
  // «Flete» (4 columnas, fila 2) desde la 8 ocuparía la 8 a la 11, donde está «Precio» (columnas 7 a 12, filas 1 a 3); desde la 3, no.
  const columna = campo(page, 'Columna')
  await expect(columna.locator('option[value="8"]')).toBeDisabled()
  await expect(columna.locator('option[value="8"]')).toHaveText('8 — se pisa con «Precio»')
  await expect(columna.locator('option[value="3"]')).toBeEnabled()
  await guardarElBorrador(page)
  expect(itemsDeLaBase(editor.id).find((i) => i.nodo === 'flete')?.ancho).toBe(4)
  await capturar(page, info, 'despues')
})
