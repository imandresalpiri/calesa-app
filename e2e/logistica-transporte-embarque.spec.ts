import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { embarqueDeLaBase } from './soporte/embarques'
import { demorarPedido } from './soporte/esperas'
import {
  borrarTransporte,
  sembrarTransporte,
  transporteDe,
  type TerrenoDeTransporte,
} from './soporte/transporte'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// El embarque desde el hueco «Transporte»: tipear un booking nuevo crea el embarque del origen; el mismo booking en otro vehículo lo suma; desde entonces la línea del aviso dice a
// cuántos les cambia y lo del embarque (la ETA) cambia para los dos. La línea tiene su alto reservado: ni el esqueleto, ni «sin transporte», ni el aviso mueven lo de abajo.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeTransporte

const AVISO_DE_LOS_DOS = 'Cambia para los 2 vehículos de este embarque.'

// El marco del hueco en el drawer de su tarjeta (la tarjeta deja otra ancla, escondida, en la página).
const marcoDelHueco = (page: Page) =>
  page.locator('[role="dialog"] [data-bloque-del-hueco="transporte"]')

async function abrirElHueco(page: Page, vehiculoId: string): Promise<Locator> {
  await page.goto(`/logistica/vehiculo/${vehiculoId}`)
  const hueco = await abrirSeccionDeLaUnidad(page, 'transporte')
  await expect(hueco).toBeVisible()
  return hueco
}

// Dónde queda una caja dentro del hueco (no en la ventana: el celular desplaza la página para traer el hueco a la vista).
async function cajaEnElHueco(
  page: Page,
  lugar: Locator,
): Promise<{ arriba: number; alto: number }> {
  const [caja, marco] = await Promise.all([lugar.boundingBox(), marcoDelHueco(page).boundingBox()])
  if (!caja || !marco) throw new Error('La caja no está dibujada')
  return { arriba: caja.y - marco.y, alto: caja.height }
}

// La línea del aviso y el primer bloque («Ruta») del formulario: lo que no debe moverse.
async function medirElFormulario(page: Page, hueco: Locator) {
  return {
    aviso: await cajaEnElHueco(page, hueco.locator('[data-aviso-del-transporte]')),
    ruta: await cajaEnElHueco(page, hueco.locator('[data-slot="bloque"]').first()),
  }
}

function mismaCaja(
  medida: { arriba: number; alto: number },
  esperada: { arriba: number; alto: number },
): void {
  expect(medida.arriba).toBeCloseTo(esperada.arriba, 0)
  expect(medida.alto).toBeCloseTo(esperada.alto, 0)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-embarque-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Embarque',
  })
  terreno = await sembrarTransporte(proyecto)
})

test.afterAll(async () => {
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E el hueco crea el embarque con un booking nuevo y después le suma otro vehículo', async ({
  page,
}) => {
  const booking = `EBK-${proyecto.toUpperCase()}`
  await entrar(page, terreno.conTransporte, { fresco: true })

  // Mientras lee, el esqueleto ya reserva la línea del aviso en el mismo lugar.
  await demorarPedido(page, (p) => p.url().includes('/rest/v1/rpc/transporte_leer'), 2_000)
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await abrirSeccionDeLaUnidad(page, 'transporte')
  const esqueleto = page.locator('[data-esqueleto-del-transporte]')
  await expect(esqueleto).toBeVisible()
  const lineaDelEsqueleto = await cajaEnElHueco(
    page,
    esqueleto.locator('[data-aviso-del-transporte]'),
  )
  const hueco = page.locator('[data-hueco="transporte"]')
  await expect(hueco.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  await page.unroute('**/*')
  const sinTransporte = await medirElFormulario(page, hueco)
  mismaCaja(lineaDelEsqueleto, sinTransporte.aviso)

  // Un booking nuevo crea el embarque del origen, con la naviera y la ETA; la unidad va en él, sin datos propios.
  await hueco.getByLabel('Naviera').selectOption({ label: terreno.naviera.nombre })
  await hueco.getByLabel('Booking', { exact: true }).fill(booking.toLowerCase())
  await hueco.getByLabel('ETA').fill('2026-12-15')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()
  const embarque = await embarqueDeLaBase(terreno.origen.id, booking)
  expect(embarque).toMatchObject({ eta_el: '2026-12-15', naviera_id: terreno.naviera.id })
  expect(await transporteDe(terreno.enFase.id)).toMatchObject({
    embarque_id: embarque?.id,
    contenedor_id: null,
    booking,
    eta_el: '2026-12-15',
  })
  // Sola en su embarque: la línea queda vacía, con su alto.
  await expect(hueco.locator('[data-aviso-del-transporte]')).toHaveText('')
  const sola = await medirElFormulario(page, hueco)
  mismaCaja(sola.aviso, sinTransporte.aviso)
  mismaCaja(sola.ruta, sinTransporte.ruta)

  // El mismo booking en el otro vehículo lo suma al embarque: toma su ETA.
  const otro = await abrirElHueco(page, terreno.sinFase.id)
  await expect(otro.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  await otro.getByLabel('Booking', { exact: true }).fill(booking)
  await otro.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()
  await expect(otro.getByText(AVISO_DE_LOS_DOS)).toBeVisible()
  expect(await transporteDe(terreno.sinFase.id)).toMatchObject({
    embarque_id: embarque?.id,
    eta_el: '2026-12-15',
  })

  // De vuelta en el primero, el aviso dice a cuántos les cambia, sin mover el formulario; la ETA nueva es la de los dos.
  const primero = await abrirElHueco(page, terreno.enFase.id)
  await expect(primero.getByText(AVISO_DE_LOS_DOS)).toBeVisible()
  const conAviso = await medirElFormulario(page, primero)
  mismaCaja(conAviso.aviso, sinTransporte.aviso)
  mismaCaja(conAviso.ruta, sinTransporte.ruta)
  await primero.getByLabel('ETA').fill('2026-12-20')
  await primero.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()
  await expect.poll(async () => (await transporteDe(terreno.sinFase.id))?.eta_el).toBe('2026-12-20')
})
