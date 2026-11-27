// @sin-celular-archivo: la fila 6.08 pide escritorio: el hueco es un formulario del panel de la unidad (el mismo en el celular, 6.01) y /logistica/embarques suma una lista con el patrón de aduana.
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarTransporte,
  crearTransporteDe,
  ponerEnElContenedorDe,
  sembrarTransporte,
  transporteDe,
  type TerrenoDeTransporte,
} from './soporte/transporte'
import { literal, sql } from './soporte/sql'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// El transporte de la unidad (6.08-2): quien lo edita carga naviera, contenedor y fechas desde el hueco «Transporte» del panel y la base lo guarda en mayúsculas; un rechazo (la ETA antes del
// zarpe) queda junto a su campo; si otra persona cargó el transporte mientras tanto, el aviso de conflicto conserva lo escrito; y quien sólo ve la logística lo lee sin poder editarlo.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeTransporte

async function abrirElHueco(page: Page, vehiculoId: string) {
  await page.goto(`/logistica/vehiculo/${vehiculoId}`)
  await abrirSeccionDeLaUnidad(page, 'transporte')
  return page.locator('[data-hueco="transporte"]')
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-transporte-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Transporte',
  })
  terreno = await sembrarTransporte(proyecto)
})

test.afterAll(async () => {
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E cargar naviera, contenedor y fechas en el hueco y verlos guardados', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await expect(hueco.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Guardar' })).toBeDisabled()

  await hueco.getByLabel('Naviera').selectOption({ label: terreno.naviera.nombre })
  await hueco.getByLabel('Contenedor', { exact: true }).fill('ecmu 123456')
  await hueco.getByLabel('Zarpe').fill('2026-12-01')
  await hueco.getByLabel('ETA').fill('2026-12-15')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()

  // Lo que quedó en la base: contenedor en mayúsculas y sin espacios, y las fechas tal cual.
  const guardado = await transporteDe(terreno.enFase.id)
  expect(guardado).toMatchObject({
    contenedor: 'ECMU123456',
    zarpe_el: '2026-12-01',
    eta_el: '2026-12-15',
    naviera_id: terreno.naviera.id,
  })

  // Al recargar, el hueco lo muestra.
  const recargado = await abrirElHueco(page, terreno.enFase.id)
  await expect(recargado.getByLabel('Contenedor', { exact: true })).toHaveValue('ECMU123456')
  await expect(recargado.getByLabel('ETA')).toHaveValue('2026-12-15')
  await expect(recargado.getByLabel('Naviera')).toHaveValue(terreno.naviera.id)
})

test('E2E la ETA antes del zarpe se rechaza junto a su campo y no se guarda', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await hueco.getByLabel('ETA').fill('2026-11-01')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(hueco.getByText('La ETA no puede ser antes del zarpe.')).toBeVisible()
  await expect(hueco.getByLabel('ETA')).toHaveAttribute('aria-invalid', 'true')
  expect((await transporteDe(terreno.enFase.id))?.eta_el).toBe('2026-12-15')
})

test('E2E si otra persona cargó el transporte, el aviso conserva lo escrito', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.sinFase.id)
  await expect(hueco.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  // Otra persona lo carga después de abrirlo y antes de guardar.
  await crearTransporteDe(terreno.sinFase.id, 'cargado por otra persona')
  await hueco.getByLabel('Notas', { exact: true }).fill('mi nota')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(hueco.getByText('No se guardó nada.', { exact: false })).toBeVisible()
  await hueco.getByRole('button', { name: 'Recargar', exact: true }).click()
  // La versión nueva llega y lo escrito sigue ahí; guardar de nuevo ya es posible.
  await expect(hueco.getByText('No se guardó nada.', { exact: false })).toHaveCount(0)
  await expect(hueco.getByLabel('Notas', { exact: true })).toHaveValue('mi nota')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()
  expect((await transporteDe(terreno.sinFase.id))?.notas).toBe('mi nota')
})

test('E2E quien sólo ve la logística lee el transporte sin poder editarlo', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await expect(hueco.getByLabel('Contenedor', { exact: true })).toHaveValue('ECMU123456')
  await expect(hueco.getByLabel('Contenedor', { exact: true })).toBeDisabled()
  await expect(
    hueco.getByText('No tienes permiso para editar el transporte de este origen.'),
  ).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})

// El id del contenedor con ese número en el origen del terreno: la URL abre un contenedor por su id, no por su número.
function idDelContenedor(numero: string): string {
  return sql(
    `select id from public.contenedores where origen_id = ${literal(terreno.origen.id)} and numero = ${literal(numero)}`,
  )
}

test('E2E ver el contenedor con sus dos vehículos en /logistica/embarques y buscarlo', async ({
  page,
}) => {
  // La segunda unidad entra al mismo contenedor (la primera ya va en él por el primer test).
  await ponerEnElContenedorDe(terreno.sinFase.id, {
    contenedor: 'ECMU123456',
    naviera_id: terreno.naviera.id,
    eta_el: '2026-12-15',
  })
  await entrar(page, terreno.conTransporte, { fresco: true })
  await page.goto(`/logistica/embarques?origen=${terreno.origen.id}&grupo=contenedores`)
  const fila = page.getByRole('row').filter({ hasText: 'ECMU123456' })
  await expect(fila).toContainText('Sin embarque')
  await expect(fila).toContainText('2 vehículos')

  await fila.getByRole('button', { name: 'Abrir el contenedor ECMU123456' }).click()
  await expect(page).toHaveURL(new RegExp(`contenedor=${idDelContenedor('ECMU123456')}`))
  const panel = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(panel.getByRole('heading', { name: 'Contenedor ECMU123456' })).toBeVisible()
  await expect(panel.getByText(terreno.enFase.titulo)).toBeVisible()
  await expect(panel.getByText(terreno.sinFase.titulo)).toBeVisible()
  // No tiene `flujos.mover`: «Mover el contenedor» no se dibuja.
  await expect(panel.getByText('Mover el contenedor')).toHaveCount(0)

  // La búsqueda por el comienzo del número lo sigue mostrando; otra que no coincide lo dice.
  await page.goto(`/logistica/embarques?origen=${terreno.origen.id}&grupo=contenedores&q=ecm`)
  await expect(page.getByRole('row').filter({ hasText: 'ECMU123456' })).toBeVisible()
  await page.goto(`/logistica/embarques?origen=${terreno.origen.id}&grupo=contenedores&q=zzz`)
  await expect(page.getByText('Ningún contenedor coincide con los filtros.')).toBeVisible()
})

test('E2E «Editar el contenedor» le pone el sello y vuelve al drawer', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const id = idDelContenedor('ECMU123456')
  await page.goto(
    `/logistica/embarques?origen=${terreno.origen.id}&grupo=contenedores&contenedor=${id}`,
  )
  const drawer = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(drawer.getByText('Sin sello')).toBeVisible()
  await drawer.getByRole('button', { name: 'Más acciones de Contenedor ECMU123456' }).click()
  await page.getByRole('menuitem', { name: 'Editar el contenedor' }).click()
  await expect(page).toHaveURL(/panel=editar-contenedor/)

  const modal = page.getByRole('dialog', { name: 'Editar el contenedor' })
  await expect(modal.getByLabel('Número')).toHaveValue('ECMU123456')
  await modal.getByLabel('Sello').fill('SL-778')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Contenedor guardado.')).toBeVisible()

  // Vuelve al drawer del mismo contenedor, sin el modal, con el sello nuevo.
  await expect(page).not.toHaveURL(/panel=editar-contenedor/)
  await expect(page).toHaveURL(new RegExp(`contenedor=${id}`))
  await expect(drawer.getByText('Sello SL-778')).toBeVisible()
  expect(sql(`select sello from public.contenedores where id = ${literal(id)}`)).toBe('SL-778')
})

test('E2E un contenedor que no existe lo dice en su drawer', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  await page.goto(
    `/logistica/embarques?origen=${terreno.origen.id}&grupo=contenedores&contenedor=ECMU123456`,
  )
  await expect(
    page
      .getByRole('dialog', { name: 'Contenedor' })
      .getByText('Este contenedor no existe o ya no lo ves.'),
  ).toBeVisible()
})

test('E2E quien no ve la logística no entra a /logistica/embarques', async ({ page }) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto('/logistica/embarques')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})
