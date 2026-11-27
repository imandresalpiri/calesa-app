import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarDinero, sembrarDinero, type TerrenoDeDinero } from './soporte/dinero'
import { quieto } from './soporte/recorrido'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// El drawer de Dinero no salta al cambiar de vista (`.claude/rules/ui.md` › «Sin saltos de interfaz»): mide lo mismo en Gastos, Pagos y Margen, en escritorio y en el celular.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDinero

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-dinero-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Dinero',
  })
  terreno = await sembrarDinero(proyecto)
})

test.afterAll(async () => {
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E el drawer de Dinero mide lo mismo en Gastos, Pagos y Margen', async ({ page }) => {
  await entrar(page, terreno.conDinero, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await abrirSeccionDeLaUnidad(page, 'gastos')
  await expect(page.getByText('Esta unidad no tiene gastos registrados.')).toBeVisible()

  const drawer = page
    .getByRole('dialog')
    .filter({ has: page.locator('[data-vistas-de-la-tarjeta]') })
  // Se mide con el drawer ya deslizado.
  await quieto(drawer)
  const caja = await drawer.boundingBox()
  expect(caja).not.toBeNull()

  await abrirSeccionDeLaUnidad(page, 'pagos')
  await expect(page.getByText('Esta unidad no tiene pagos registrados.')).toBeVisible()
  expect(await drawer.boundingBox()).toEqual(caja)

  await abrirSeccionDeLaUnidad(page, 'margen')
  await expect(
    page.locator('[data-hueco="margen"][data-estado="listo"] [data-cifra="margen"]'),
  ).toContainText('Sin venta registrada')
  expect(await drawer.boundingBox()).toEqual(caja)

  await abrirSeccionDeLaUnidad(page, 'gastos')
  expect(await drawer.boundingBox()).toEqual(caja)
})
