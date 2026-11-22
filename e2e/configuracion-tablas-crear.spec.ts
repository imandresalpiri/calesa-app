// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarConTablaViva } from './soporte/cotizar-guardada'
import { literal, sql } from './soporte/sql'

// Crear tablas de referencia y cambiar sus columnas desde la configuración (`docs/COTIZADOR.md` › «Crear, columnas y desactivar»): «Nueva tabla», sus filas y su
// publicación, «Columnas» (renombrar, sumar y quitar), la columna en uso que la base rechaza, la clave repetida y «Desactivar»; y una compartida desde Catálogos.
// El PT409, los permisos de otro origen y los topes los prueban `supabase/tests/areas/tablas/` y las carreras.

let origen = { id: '', nombre: '' }
let duena = ''
const NOMBRE = 'E2E Fletes por puerto'
const COMPARTIDA = 'E2E Compartida nueva'

const borrarCompartidasDePrueba = () =>
  sql(`delete from public.tablas_referencia where origen_id is null and clave like 'e2e\\_%'`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarCompartidasDePrueba()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tablas-crear-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tita Tablas' })
  origen = await crearOrigenDeCotizar(proyecto, 'vtcrear', false)
  // `ch_tabla` («Factores vivos»: Año y Factor) la lee la fórmula publicada del origen.
  publicarConTablaViva(origen.id, 22)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarCompartidasDePrueba()
  await borrarPersonasDePrueba()
})

const deLaTabla = (clave: string, columna: string) =>
  sql(`
    select ${columna} from public.tablas_referencia
     where origen_id = ${literal(origen.id)}::uuid and clave = ${literal(clave)}`)

async function crearLaTabla(page: Page) {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/tablas`)
  await page.getByRole('button', { name: 'Nueva tabla' }).click()

  const nueva = page.getByRole('dialog', { name: 'Nueva tabla' })
  await nueva.getByLabel('Nombre', { exact: true }).fill(NOMBRE)
  await expect(nueva.getByText('e2e_fletes_por_puerto', { exact: true })).toBeVisible()
  await expect(nueva.getByRole('radio', { name: `Sólo ${origen.nombre}` })).toBeChecked()
  await nueva.getByLabel('Nombre de la columna 1').fill('Puerto')
  await nueva.getByLabel('Tipo de Puerto').selectOption('texto')
  await nueva.getByRole('button', { name: 'Sumar una columna' }).click()
  await nueva.getByLabel('Nombre de la columna 2').fill('Monto')
  await nueva.getByRole('button', { name: 'Sumar una columna' }).click()
  await nueva.getByLabel('Nombre de la columna 3').fill('Año')
  await nueva.getByLabel('Tipo de Año').selectOption('anio')
  await nueva.getByRole('button', { name: 'Subir Año' }).click()
  await expect(nueva.getByLabel('Nombre de la columna 2')).toHaveValue('Año')
  await nueva.getByRole('button', { name: 'Crear tabla' }).click()

  await expect(page.getByText(`Creaste «${NOMBRE}». Suma sus filas y publícala.`)).toBeVisible()
  await expect(page).toHaveURL(/[?&]tabla=[0-9a-f-]{36}/)
  const editor = page.getByRole('region', { name: `Editar ${NOMBRE}` })
  await expect(editor.getByRole('heading', { name: `Editar ${NOMBRE}` })).toBeVisible()
  expect(JSON.parse(deLaTabla('e2e_fletes_por_puerto', `columnas::text || ''`) || '[]')).toEqual([
    { clave: 'puerto', etiqueta: 'Puerto', tipo: 'texto' },
    { clave: 'ano', etiqueta: 'Año', tipo: 'anio' },
    { clave: 'monto', etiqueta: 'Monto', tipo: 'numero' },
  ])

  return editor
}

async function publicarUnaFila(page: Page, editor: Locator) {
  // Una fila y publicar: la versión 2.
  await editor.getByRole('button', { name: 'Sumar una fila' }).click()
  await editor.getByLabel('Puerto, fila 1').fill('Arica')
  await editor.getByLabel('Año, fila 1').fill('2024')
  await editor.getByLabel('Monto, fila 1').fill('150')
  await editor.getByLabel('Monto, fila 1').press('Tab')
  await editor.getByRole('button', { name: 'Publicar' }).click()
  const publicar = page.getByRole('dialog', { name: `Publicar ${NOMBRE}` })
  await publicar.getByLabel('Nota').fill('E2E primera')
  await publicar.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText(`Publicaste la versión 2 de «${NOMBRE}».`)).toBeVisible()
  await expect(editor.getByText('Sin cambios que publicar.')).toBeVisible()
}

async function cambiarLasColumnas(page: Page, editor: Locator) {
  // «Columnas»: renombrar «Monto», sumar «Recargo» y quitar «Año».
  await editor.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click()
  await page.getByRole('menuitem', { name: 'Columnas' }).click()
  const columnas = page.getByRole('dialog', { name: `Columnas de ${NOMBRE}` })
  await expect(columnas.getByText('Sin cambios en las columnas.')).toBeVisible()
  await columnas.getByLabel('Nombre de la columna 3').fill('Monto USD')
  await columnas.getByRole('button', { name: 'Sumar una columna' }).click()
  await columnas.getByLabel('Nombre de la columna 4').fill('Recargo')
  await columnas.getByRole('button', { name: 'Quitar Año' }).click()
  await expect(columnas.getByText('Se quita', { exact: true })).toBeVisible()
  await expect(
    columnas.getByText('Quitar una columna borra sus valores de todas las filas.'),
  ).toBeVisible()
  await expect(
    columnas.getByText('Se suma 1 · se renombra 1 · se quita 1', { exact: true }),
  ).toBeVisible()
  await columnas.getByRole('button', { name: 'Guardar columnas' }).click()
  await expect(page.getByText(`Guardaste las columnas de «${NOMBRE}».`)).toBeVisible()
  await expect(columnas).toBeHidden()
  await expect(editor.getByLabel('Monto USD, fila 1')).toBeVisible()
  await expect(editor.getByText(/^Versión 3/)).toBeVisible()
  expect(JSON.parse(deLaTabla('e2e_fletes_por_puerto', `columnas::text || ''`) || '[]')).toEqual([
    { clave: 'puerto', etiqueta: 'Puerto', tipo: 'texto' },
    { clave: 'monto', etiqueta: 'Monto USD', tipo: 'numero' },
    { clave: 'recargo', etiqueta: 'Recargo', tipo: 'numero' },
  ])
  const valores = sql(`
    select f.valores::text from public.tablas_referencia_filas f join public.tablas_referencia t on t.id = f.tabla_id
     where t.origen_id = ${literal(origen.id)}::uuid and t.clave = 'e2e_fletes_por_puerto'`)
  expect(JSON.parse(valores)).toEqual({ puerto: 'Arica', monto: 150 })
}

// Una columna que lee la fórmula publicada no se quita: lo dice la base y nada cambia.
async function quitarUnaColumnaEnUso(page: Page) {
  await page.goto(`/configuracion/origenes/${origen.id}/tablas`)
  const lista = page.getByRole('list', { name: `Tablas de referencia de ${origen.nombre}` })
  await lista.getByRole('button', { name: 'Más acciones de Factores vivos' }).click()
  await page.getByRole('menuitem', { name: 'Columnas' }).click()
  const enUso = page.getByRole('dialog', { name: 'Columnas de Factores vivos' })
  await enUso.getByRole('button', { name: 'Quitar Factor' }).click()
  await enUso.getByRole('button', { name: 'Guardar columnas' }).click()
  await expect(
    enUso.getByText(
      new RegExp(`^La columna «Factor» la usa la fórmula publicada de .*${origen.nombre}`),
    ),
  ).toBeVisible()
  await expect(enUso.getByText('Se quita', { exact: true })).toBeVisible()
  expect(deLaTabla('ch_tabla', 'version')).toBe('1')
  await enUso.getByRole('button', { name: 'Cancelar' }).click()
  await expect(enUso).toBeHidden()
  // El «⋯» de la lista abrió la tabla con su panel: se vuelve a la lista.
  await page.getByRole('link', { name: 'Volver a las tablas' }).click()
  await expect(lista).toBeVisible()
}

async function repetirElNombre(page: Page) {
  // El mismo nombre: la clave ya está tomada, junto al nombre.
  await page.getByRole('button', { name: 'Nueva tabla' }).click()
  const repetida = page.getByRole('dialog', { name: 'Nueva tabla' })
  await repetida.getByLabel('Nombre', { exact: true }).fill(NOMBRE)
  await repetida.getByLabel('Nombre de la columna 1').fill('Puerto')
  await repetida.getByRole('button', { name: 'Crear tabla' }).click()
  await expect(
    repetida.getByText(/^Ya hay una tabla con la clave «e2e_fletes_por_puerto»/),
  ).toBeVisible()
  await expect(repetida.getByLabel('Nombre', { exact: true })).toBeFocused()
  await repetida.getByRole('button', { name: 'Cancelar' }).click()
  await expect(repetida).toBeHidden()
}

async function desactivarLaTabla(page: Page) {
  const lista = page.getByRole('list', { name: `Tablas de referencia de ${origen.nombre}` })
  // «Desactivar»: vuelve a la lista, sin la tabla.
  await lista.getByRole('button', { name: `Más acciones de ${NOMBRE}` }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  const confirmar = page.getByRole('dialog', { name: `Desactivar «${NOMBRE}»` })
  await confirmar.getByRole('button', { name: 'Desactivar' }).click()
  await expect(page.getByText(`Desactivaste «${NOMBRE}».`)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${origen.id}/tablas$`))
  await expect(lista.getByRole('link', { name: NOMBRE })).toBeHidden()
  expect(deLaTabla('e2e_fletes_por_puerto', 'activa')).toBe('f')
}

test('E2E escritorio · camino feliz: crear una tabla, cambiar sus columnas y desactivarla', async ({
  page,
}) => {
  const editor = await crearLaTabla(page)
  await publicarUnaFila(page, editor)
  await cambiarLasColumnas(page, editor)
  await quitarUnaColumnaEnUso(page)
  await repetirElNombre(page)
  await desactivarLaTabla(page)
})

test('E2E escritorio · camino feliz: crear una tabla compartida en Catálogos', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/catalogos/tablas')
  await page.getByRole('button', { name: 'Nueva tabla' }).click()
  const nueva = page.getByRole('dialog', { name: 'Nueva tabla' })
  await expect(nueva.getByRole('radio')).toHaveCount(0)
  await nueva.getByLabel('Nombre', { exact: true }).fill(COMPARTIDA)
  await nueva.getByLabel('Nombre de la columna 1').fill('Factor')
  await nueva.getByRole('button', { name: 'Crear tabla' }).click()
  await expect(page.getByRole('heading', { name: `Editar ${COMPARTIDA}` })).toBeVisible()
  expect(
    sql(
      `select count(*) from public.tablas_referencia where origen_id is null and clave = 'e2e_compartida_nueva' and activa`,
    ),
  ).toBe('1')

  await page.goto(`/configuracion/origenes/${origen.id}/tablas`)
  const fila = page
    .getByRole('list', { name: `Tablas de referencia de ${origen.nombre}` })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: COMPARTIDA }) })
  await expect(fila.getByText('Compartida', { exact: true })).toBeVisible()
})
