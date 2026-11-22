// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio (e2e.md).
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarFormulaDeTresSumandos, publicarLaVersionConAspecto } from './soporte/diseno-editor'
import { literal, sql } from './soporte/sql'
import { PREFIJO_DE_COLOR_DE_PRUEBA, borrarColoresDePrueba } from './soporte/tonos'

// El modal «Colores» de Orígenes (docs/UX.md › «Cotización: colores (estados propios)»; la tabla `tonos`): el camino feliz en escritorio. Un color se crea con un nombre y un
// #hex; sus muestras de la hoja, en vivo, son las que deriva la base (`_color_derivar`), y la de la tarjeta, el hex tal cual con su aviso suave si el texto no se
// lee. Cambiar el hex vuelve a derivar la hoja de una cotización cuya sección lo nombra; un color en uso no se elimina. Un hex mal escrito no sale.
test.describe.configure({ mode: 'serial' })

const TEAL = `${PREFIJO_DE_COLOR_DE_PRUEBA} Verde teal`
const TEAL_RENOMBRADO = `${PREFIJO_DE_COLOR_DE_PRUEBA} Teal`
const AMARILLO = `${PREFIJO_DE_COLOR_DE_PRUEBA} Amarillo claro`
const AVISO = 'Con este color el texto de la tarjeta se lee con dificultad.'
const CLAVE_DEL_ORIGEN = (proyecto: string) => `e2e_4_13_colores_${proyecto}`

let duena = ''
let origen = { id: '', nombre: '' }

function borrarElOrigen(proyecto: string): void {
  // Las fórmulas que nombran el color caen con el origen (`on delete cascade`).
  sql(`
    delete from public.cotizaciones where origen_id in (select id from public.origenes where clave = ${literal(CLAVE_DEL_ORIGEN(proyecto))});
    delete from public.origenes where clave = ${literal(CLAVE_DEL_ORIGEN(proyecto))}`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarElOrigen(proyecto)
  borrarColoresDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-colores-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Celia Colores' })
  origen = await crearOrigenDeCotizar(proyecto, 'colores', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async ({}, info) => {
  borrarElOrigen(info.project.name)
  borrarColoresDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => String(Number.parseInt(hex.slice(i, i + 2), 16))).join(', ')})`

const derivado = (hex: string) =>
  JSON.parse(sql(`select public._color_derivar(${literal(hex)})::text`)) as Record<
    'claro' | 'oscuro',
    { fondo: string; borde: string; tinta: string }
  >

const enLaBase = (nombre: string) =>
  sql(`select coalesce(json_agg(t)::text, '[]') from (
         select hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta
           from public.tonos where nombre = ${literal(nombre)}) t`)

const fila = (page: Page, nombre: string) =>
  page.locator('li[data-color]').filter({ has: page.getByText(nombre, { exact: true }) })

// La lista de colores vive en un modal de Configuración › Orígenes (`?panel=colores`); «Nuevo», «Editar» y «Eliminar» son modales hermanos que vuelven a ella.
async function abrirColores(page: Page) {
  await page.goto('/configuracion/origenes?panel=colores')
  await expect(page.getByRole('dialog', { name: 'Colores', exact: true })).toBeVisible()
}

async function escribir(modal: Locator, nombre: string | null, hex: string) {
  if (nombre !== null) await modal.getByLabel('Nombre', { exact: true }).fill(nombre)
  await modal.getByLabel('Color', { exact: true }).fill(hex)
}

// Las muestras en vivo de la hoja tienen el fondo, el borde y la tinta que deriva la base: el espejo TS de la pantalla da lo mismo.
async function muestrasDeLaHoja(modal: Locator, hex: string) {
  const d = derivado(hex)
  for (const tema of ['claro', 'oscuro'] as const) {
    const muestra = modal.locator(`[data-muestra="${tema}"]`)
    await expect(muestra).toHaveCSS('background-color', rgb(d[tema].fondo))
    await expect(muestra).toHaveCSS('border-top-color', rgb(d[tema].borde))
    await expect(muestra).toHaveCSS('color', rgb(d[tema].tinta))
  }
}

async function eliminarDesdeElMenu(page: Page, nombre: string) {
  await page.getByRole('button', { name: `Más acciones de «${nombre}»`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Eliminar…', exact: true }).click()
  const confirmar = page.getByRole('dialog', { name: `Eliminar el color «${nombre}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar color', exact: true }).click()
  await expect(confirmar).toBeHidden()
}

test('C1: «Colores» con los de fábrica; crear por hex con sus muestras de hoja y tarjeta en vivo (y el aviso suave), recargar y renombrar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirColores(page)
  for (const clave of ['amarillo', 'verde', 'naranja']) {
    await expect(page.locator(`li[data-color="${clave}"]`)).toBeVisible()
  }

  await page.getByRole('button', { name: 'Nuevo color', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Nuevo color' })
  await expect(modal).toBeVisible()
  await escribir(modal, TEAL, '#31869b')
  await muestrasDeLaHoja(modal, '#31869b')
  // La tarjeta pinta el hex tal cual; con negro da 3,8:1 y con blanco 4,1:1: el aviso sale y no frena el guardado.
  await expect(modal.locator('[data-muestra="tarjeta"]')).toHaveCSS(
    'background-color',
    rgb('#31869b'),
  )
  await expect(modal).toContainText('Con texto negro: 3,8:1')
  await expect(modal).toContainText('Con texto blanco: 4,1:1')
  await expect(modal.getByText(AVISO, { exact: true })).toBeVisible()
  await modal.getByRole('button', { name: 'Crear color', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(fila(page, TEAL)).toBeVisible()

  // En la base: el hex tal cual y la hoja que la base derivó de él.
  const d = derivado('#31869b')
  const esperado = JSON.stringify([
    {
      hex: '#31869b',
      claro_fondo: d.claro.fondo,
      claro_borde: d.claro.borde,
      claro_tinta: d.claro.tinta,
      oscuro_fondo: d.oscuro.fondo,
      oscuro_borde: d.oscuro.borde,
      oscuro_tinta: d.oscuro.tinta,
    },
  ])
  expect(JSON.stringify(JSON.parse(enLaBase(TEAL)))).toBe(esperado)
  await page.reload()
  await expect(fila(page, TEAL)).toBeVisible()

  await page.getByRole('button', { name: `Editar «${TEAL}»`, exact: true }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar color' })
  await escribir(edicion, TEAL_RENOMBRADO, '#31869b')
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(edicion).toBeHidden()
  await expect(fila(page, TEAL_RENOMBRADO)).toBeVisible()
  await expect(fila(page, TEAL)).toHaveCount(0)
})

test('C2: la hoja de una cotización cuya sección nombra el color se ve con lo derivado; cambiar el hex la vuelve a derivar; en uso no se elimina', async ({
  page,
}) => {
  const clave = sql(`select clave from public.tonos where nombre = ${literal(TEAL_RENOMBRADO)}`)
  expect(clave).not.toBe('')
  publicarLaVersionConAspecto(origen.id, clave)
  await entrar(page, duena, { fresco: true })
  const base = page.locator('main [data-seccion="base"]')
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(base).toHaveAttribute('data-tono', clave)
  await expect(base).toHaveCSS('border-top-color', rgb(derivado('#31869b').claro.borde))

  await abrirColores(page)
  await page.getByRole('button', { name: `Editar «${TEAL_RENOMBRADO}»`, exact: true }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar color' })
  await escribir(edicion, null, '#7048e8')
  await muestrasDeLaHoja(edicion, '#7048e8')
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(edicion).toBeHidden()
  await expect
    .poll(() => sql(`select hex from public.tonos where clave = ${literal(clave)}`))
    .toBe('#7048e8')
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(base).toHaveCSS('border-top-color', rgb(derivado('#7048e8').claro.borde))

  // La fórmula del origen lo nombra: la base lo rechaza diciendo cuál, el diálogo se cierra y el color sigue.
  await abrirColores(page)
  await eliminarDesdeElMenu(page, TEAL_RENOMBRADO)
  await expect(
    page.getByText(`«${TEAL_RENOMBRADO}» lo usa la fórmula de «${origen.nombre}»`),
  ).toBeVisible()
  await expect(fila(page, TEAL_RENOMBRADO)).toBeVisible()
  expect(sql(`select count(*) from public.tonos where clave = ${literal(clave)}`)).toBe('1')
})

test('C3: un amarillo claro no muestra el aviso; un hex mal escrito no sale; se crea y se elimina desde el «⋯»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirColores(page)
  await page.getByRole('button', { name: 'Nuevo color', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Nuevo color' })
  await escribir(modal, AMARILLO, '#fff2cc')
  // Con texto negro da más de 14:1: la muestra de la tarjeta cambia y el aviso (que el teal de partida mostraba) se va.
  await expect(modal.locator('[data-muestra="tarjeta"]')).toHaveCSS(
    'background-color',
    rgb('#fff2cc'),
  )
  await expect(modal).toContainText('Con texto negro: 14,4:1')
  await expect(modal.getByText(AVISO, { exact: true })).toHaveCount(0)

  // Mal escrito: las muestras no se dibujan y el motivo va junto al campo; nada sale.
  await escribir(modal, null, '#fff')
  await expect(modal.locator('[data-como-se-ve]')).toHaveCount(0)
  await modal.getByRole('button', { name: 'Crear color', exact: true }).click()
  await expect(modal.getByText('Escríbelo como #rrggbb, por ejemplo #31869b.')).toBeVisible()
  await expect(modal.getByLabel('Color', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(modal).toBeVisible()
  expect(enLaBase(AMARILLO)).toBe('[]')

  await escribir(modal, null, '#fff2cc')
  await modal.getByRole('button', { name: 'Crear color', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(fila(page, AMARILLO)).toBeVisible()
  await expect.poll(() => JSON.parse(enLaBase(AMARILLO)).length as number).toBe(1)

  await eliminarDesdeElMenu(page, AMARILLO)
  await expect(fila(page, AMARILLO)).toHaveCount(0)
  await expect.poll(() => enLaBase(AMARILLO)).toBe('[]')
  await expect(page.locator('li[data-color="amarillo"]')).toBeVisible()
})
