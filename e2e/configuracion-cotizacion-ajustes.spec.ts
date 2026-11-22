// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
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
import { sql } from './soporte/sql'

// Configuración › Orígenes › tarjeta y modal «Vigencia» (4.20-4b, `docs/UX.md` › «Cotización: vigencia (estados propios)»): la vigencia (si el vehículo y el lead son
// obligatorios se decide por rol y origen en «Roles y permisos»; la línea de abajo lleva allí). La ve quien tiene `cotizaciones.configurar` en algún origen y la cambia quien la tiene en todos. El conflicto de versión lo prueba la T3 de
// `supabase/tests/empresa-ajustes-de-cotizacion.sql`. La fila es única: se restaura al final (el e2e corre con un solo worker).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let antes = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  antes = sql('select vigencia_dias from public.ajustes_empresa')
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ajustes-cot-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Vigencia' })
  configuradora = correoDePrueba(`configura-ajustes-cot-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Uma Unorigen',
    invitada: true,
  })
  const origenId = sql('select id from public.origenes order by clave limit 1')
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Configura un origen ${proyecto}`,
      clave: `e2e_configura_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId }],
  })
})

test.afterAll(async () => {
  if (antes !== '') {
    sql(`update public.ajustes_empresa set vigencia_dias = ${Number(antes)}`)
  }
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const vigencia = (page: Page) => page.getByLabel('Vigencia (días)')
const modal = (page: Page) => page.getByRole('dialog', { name: 'Vigencia', exact: true })

test('la dueña cambia la vigencia desde su tarjeta de Orígenes y queda guardada; la línea de «Roles y permisos» la lleva allí', async ({
  page,
}) => {
  sql('update public.ajustes_empresa set vigencia_dias = 15')
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/origenes')
  await expect(
    page.getByRole('heading', { name: 'Para todos los orígenes', level: 2 }),
  ).toBeVisible()
  await expect(page.getByText('15 días', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Editar vigencia', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/origenes\?panel=vigencia$/)
  await expect(modal(page)).toBeVisible()
  await expect(vigencia(page)).toHaveValue('15')
  await expect(
    page.getByText(
      'Si una cotización pide vehículo y lead se decide por rol y origen en «Roles y permisos».',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a Roles y permisos' })).toHaveAttribute(
    'href',
    '/configuracion/roles',
  )

  // Un valor fuera de 1–365 no sale y dice por qué junto al campo.
  await vigencia(page).fill('400')
  await modal(page).getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(modal(page).getByText('La vigencia va de 1 a 365 días.')).toBeVisible()
  expect(sql('select vigencia_dias from public.ajustes_empresa')).toBe('15')

  await vigencia(page).fill('30')
  await modal(page).getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(modal(page)).toBeHidden()
  await expect(page.getByText('Vigencia guardada')).toBeVisible()
  expect(sql('select vigencia_dias from public.ajustes_empresa')).toBe('30')

  await page.reload()
  await expect(page.getByText('30 días', { exact: true })).toBeVisible()
})

test('quien configura un solo origen ve la vigencia en su tarjeta, con el motivo y sin poder abrirla', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto('/configuracion/origenes')
  await expect(
    page.getByRole('heading', { name: 'Para todos los orígenes', level: 2 }),
  ).toBeVisible()
  await expect(
    page.getByText('Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar vigencia', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Más acciones de Vigencia', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Editar vigencia…' })).toBeDisabled()
  await page.keyboard.press('Escape')

  // Por la dirección tampoco abre: el panel se limpia.
  await page.goto('/configuracion/origenes?panel=vigencia')
  await expect(
    page.getByRole('heading', { name: 'Para todos los orígenes', level: 2 }),
  ).toBeVisible()
  await expect(modal(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/configuracion\/origenes$/)
})
