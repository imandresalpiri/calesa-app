// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarConTablaViva } from './soporte/cotizar-guardada'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'
import { literal, sql } from './soporte/sql'

// El drawer «Tablas» de un origen con sus dos grupos («De <origen>» y «Compartidas»), crear una propia y una compartida desde él, editar una compartida con su aviso, el «⋯» y
// tocar la fila (`docs/UX.md` › «Cotización: tablas (estados propios)»). Los permisos de cada origen que usa una compartida los prueba `supabase/tests/areas/tablas/`.

const COLUMNAS = `'[{"clave":"factor","etiqueta":"Factor","tipo":"numero"}]'::jsonb`
const TAPADA = 'E2E Tapada'
const ARANCEL = 'E2E Arancel compartido'
const PROPIA_NUEVA = 'E2E Propia nueva'
const COMPARTIDA_NUEVA = 'E2E Compartida nueva'

let origen = { id: '', nombre: '' }
let duena = ''

const borrarLoMio = () =>
  sql(`delete from public.tablas_referencia where clave like 'e2e\\_%' and nombre like 'E2E %'`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoMio()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tablas-drawer-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tita Tablas' })
  origen = await crearOrigenDeCotizar(proyecto, 'vtdrawer', false)
  publicarConTablaViva(origen.id, 22)
  // Una compartida que recibe el origen, y otra que su propia tabla tapa.
  sql(`
    insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values
      (null, 'e2e_arancel', ${literal(ARANCEL)}, ${COLUMNAS}),
      (null, 'e2e_tapada', ${literal(`${TAPADA} compartida`)}, ${COLUMNAS}),
      (${literal(origen.id)}::uuid, 'e2e_tapada', ${literal(`${TAPADA} propia`)}, ${COLUMNAS})`)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoMio()
  await borrarPersonasDePrueba()
})

const idDeLaCompartida = (clave: string) =>
  sql(
    `select id from public.tablas_referencia where origen_id is null and clave = ${literal(clave)}`,
  )

async function abrirElDrawer(page: Page) {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDeLaFormula(origen.id, 'planilla', 'panel=tablas'))
  return page.getByRole('dialog', { name: 'Tablas de referencia' })
}

test('E2E escritorio · los dos grupos, la tapada, el «⋯» y tocar la fila', async ({ page }) => {
  const drawer = await abrirElDrawer(page)
  const propias = drawer.getByRole('list', { name: `De ${origen.nombre}` })
  const compartidas = drawer.getByRole('list', { name: 'Compartidas' })
  await expect(propias.getByRole('button', { name: 'Editar Factores vivos' })).toBeVisible()
  await expect(propias.getByRole('button', { name: `Editar ${TAPADA} propia` })).toBeVisible()
  await expect(compartidas.getByRole('button', { name: `Editar ${ARANCEL}` })).toBeVisible()
  await expect(
    compartidas.getByRole('button', { name: `Editar ${TAPADA} compartida` }),
  ).toBeVisible()
  // La insignia «Compartida» sobra dentro de su grupo; la tapada sí lo dice.
  await expect(drawer.getByText('Compartida', { exact: true })).toHaveCount(0)
  await expect(compartidas.getByText(`Tapada por la de ${origen.nombre}`)).toBeVisible()
  await expect(propias.getByText('Tapada por la', { exact: false })).toHaveCount(0)

  // Cada fila lleva sólo su «⋯» con la lista única de acciones.
  await compartidas.getByRole('button', { name: `Más acciones de ${ARANCEL}` }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['Editar filas', 'Columnas', 'Desactivar'])
  await page.keyboard.press('Escape')

  // Tocar la fila (fuera del «⋯») abre «Editar filas».
  await compartidas.getByRole('button', { name: `Editar ${ARANCEL}` }).click()
  await expect(page).toHaveURL(new RegExp(`tabla=${idDeLaCompartida('e2e_arancel')}`))
  const editor = drawer.getByRole('region', { name: `Editar ${ARANCEL}` })
  await expect(editor.getByRole('heading', { name: `Editar ${ARANCEL}` })).toBeVisible()
  // Editar una compartida avisa a qué orígenes les cambia.
  await expect(
    editor.getByText(/^Compartida: la usan los orígenes que no tienen una propia/),
  ).toBeVisible()
  await drawer.getByRole('link', { name: 'Volver a las tablas' }).click()
  await expect(propias).toBeVisible()
})

test('E2E escritorio · crear una tabla propia y una compartida desde el drawer', async ({
  page,
}) => {
  const drawer = await abrirElDrawer(page)
  for (const [nombre, compartida] of [
    [PROPIA_NUEVA, false],
    [COMPARTIDA_NUEVA, true],
  ] as const) {
    await page.getByRole('button', { name: 'Nueva tabla' }).click()
    const nueva = page.getByRole('dialog', { name: 'Nueva tabla' })
    await expect(nueva.getByRole('radio', { name: `Sólo de ${origen.nombre}` })).toBeChecked()
    await expect(
      nueva.getByRole('radio', { name: 'Compartida con todos los orígenes' }),
    ).toBeVisible()
    if (compartida)
      await nueva.getByText('Compartida con todos los orígenes', { exact: true }).click()
    await nueva.getByLabel('Nombre', { exact: true }).fill(nombre)
    await nueva.getByLabel('Nombre de la columna 1').fill('Factor')
    await nueva.getByRole('button', { name: 'Crear tabla' }).click()
    const editor = drawer.getByRole('region', { name: `Editar ${nombre}` })
    await expect(editor.getByRole('heading', { name: `Editar ${nombre}` })).toBeVisible()
    await drawer.getByRole('link', { name: 'Volver a las tablas' }).click()
  }
  expect(
    sql(
      `select coalesce(origen_id::text, 'compartida') from public.tablas_referencia where nombre = ${literal(PROPIA_NUEVA)}`,
    ),
  ).toBe(origen.id)
  expect(
    sql(
      `select coalesce(origen_id::text, 'compartida') from public.tablas_referencia where nombre = ${literal(COMPARTIDA_NUEVA)}`,
    ),
  ).toBe('compartida')
  await expect(
    drawer
      .getByRole('list', { name: `De ${origen.nombre}` })
      .getByRole('button', { name: `Editar ${PROPIA_NUEVA}` }),
  ).toBeVisible()
  await expect(
    drawer
      .getByRole('list', { name: 'Compartidas' })
      .getByRole('button', { name: `Editar ${COMPARTIDA_NUEVA}` }),
  ).toBeVisible()
})
