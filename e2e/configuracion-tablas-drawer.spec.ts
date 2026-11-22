// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarConTablaViva } from './soporte/cotizar-guardada'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'
import { literal, sql } from './soporte/sql'

// El drawer «Tablas» de un origen con sus dos grupos («De <origen>» y «Compartidas»), crear una propia y una compartida desde él, editar una compartida con su aviso, el «⋯» y
// tocar la fila, y la URL vieja `/configuracion/catalogos/tablas`, que responde 308 al drawer del primer origen que la persona configura (`docs/UX.md` › «Cotización: tablas
// (estados propios)»). Los permisos de cada origen que usa una compartida los prueba `supabase/tests/areas/tablas/`.

const COLUMNAS = `'[{"clave":"factor","etiqueta":"Factor","tipo":"numero"}]'::jsonb`
const TAPADA = 'E2E Tapada'
const ARANCEL = 'E2E Arancel compartido'
const PROPIA_NUEVA = 'E2E Propia nueva'
const COMPARTIDA_NUEVA = 'E2E Compartida nueva'
const UUID = '[0-9a-f-]{36}'

let origen = { id: '', nombre: '' }
let duena = ''
let sinOrigen = ''

const borrarLoMio = () =>
  sql(`delete from public.tablas_referencia where clave like 'e2e\\_%' and nombre like 'E2E %'`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
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
  sinOrigen = correoDePrueba(`sin-origen-tablas-drawer-${proyecto}`)
  await crearPersona({
    email: sinOrigen,
    contrasena: CONTRASENA,
    nombre: 'Lola Leads',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinOrigen,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sin origen tablas ${proyecto}`,
      clave: `e2e_sin_origen_tablas_${proyecto}`,
    },
    permisos: ['leads.configurar'],
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
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
      await nueva.getByRole('radio', { name: 'Compartida con todos los orígenes' }).check()
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

// `/configuracion/catalogos/tablas` ya no es una página: 308 por persona al drawer del primer origen que la persona configura.
const DRAWER = new RegExp(`^/configuracion/origenes/${UUID}/planilla\\?(.*&)?panel=tablas(&|$)`)

test('E2E escritorio · la URL vieja de las tablas compartidas, sin consulta, abre el drawer de un origen', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const respuesta = await page.request.get('/configuracion/catalogos/tablas', { maxRedirects: 0 })
  expect(respuesta.status()).toBe(308)
  expect(respuesta.headers()['location']).toMatch(DRAWER)
  expect(respuesta.headers()['cache-control']).toBe('private, no-store')
  await page.goto('/configuracion/catalogos/tablas')
  await expect(page.getByRole('dialog', { name: 'Tablas de referencia' })).toBeVisible()
})

test('E2E escritorio · con `?tabla=` abre esa tabla en el drawer', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const id = idDeLaCompartida('e2e_arancel')
  await page.goto(`/configuracion/catalogos/tablas?tabla=${id}`)
  await expect(page).toHaveURL(new RegExp(`/planilla\\?(.*&)?panel=tablas&tabla=${id}`))
  await expect(
    page
      .getByRole('dialog', { name: 'Tablas de referencia' })
      .getByRole('heading', { name: `Editar ${ARANCEL}` }),
  ).toBeVisible()
})

test('E2E escritorio · con `?tabla=&panel=publicar-tabla` el panel viaja en `accion`', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = idDeLaCompartida('e2e_arancel')
  const respuesta = await page.request.get(
    `/configuracion/catalogos/tablas?tabla=${id}&panel=publicar-tabla`,
    { maxRedirects: 0 },
  )
  expect(respuesta.status()).toBe(308)
  expect(respuesta.headers()['location']).toMatch(
    new RegExp(`/planilla\\?(.*&)?panel=tablas&tabla=${id}&accion=publicar-tabla$`),
  )
})

test('E2E escritorio · una `?tabla=` que no existe abre el drawer del primer origen, sin la tabla', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const respuesta = await page.request.get(
    '/configuracion/catalogos/tablas?tabla=00000000-0000-4000-8000-000000000000',
    { maxRedirects: 0 },
  )
  expect(respuesta.status()).toBe(308)
  const destino = respuesta.headers()['location'] ?? ''
  expect(destino).toMatch(DRAWER)
  expect(destino).not.toContain('tabla=')
})

test('E2E escritorio · sin ningún origen que configure, la URL vieja lleva al inicio de Configuración', async ({
  page,
}) => {
  await entrar(page, sinOrigen, { fresco: true })
  const respuesta = await page.request.get('/configuracion/catalogos/tablas', { maxRedirects: 0 })
  expect(respuesta.status()).toBe(308)
  expect(respuesta.headers()['location']).toBe('/configuracion/inicio')
})
