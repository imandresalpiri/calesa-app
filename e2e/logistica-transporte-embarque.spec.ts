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

// El embarque desde el hueco «Transporte»: «Elegir o crear» › «Crear» con booking y naviera crea el embarque del origen y pone la unidad en él; otro vehículo lo elige de la lista y se
// suma; desde entonces la línea del aviso dice a cuántos les cambia lo del embarque, que se muestra (no es campo) con «Editar el embarque». La línea tiene su alto reservado: ni el
// esqueleto ni el aviso mueven «Dónde viaja».
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

// La línea del aviso y el grupo de las notas: lo que no debe moverse.
async function medirElFormulario(page: Page, hueco: Locator) {
  return {
    aviso: await cajaEnElHueco(page, hueco.locator('[data-aviso-del-transporte]')),
    notas: await cajaEnElHueco(page, hueco.getByRole('region', { name: 'Notas' })),
  }
}

// «Elegir o crear» (o «Cambiar») abre el modal; sin la regla del contenedor apagada, primero se elige «Embarque».
async function abrirElModal(page: Page, hueco: Locator): Promise<Locator> {
  await hueco.getByRole('button', { name: /Elegir o crear|Cambiar/ }).click()
  const modal = page.getByRole('dialog', { name: 'Elegir contenedor o embarque' })
  await modal.getByRole('button', { name: 'Embarque', exact: true }).click()
  return modal
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

test('E2E el hueco crea el embarque con booking y naviera y después otro vehículo lo elige', async ({
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
  await expect(hueco.getByText('Todavía no va en ningún contenedor.')).toBeVisible()
  await page.unroute('**/*')
  const sinTransporte = await medirElFormulario(page, hueco)
  mismaCaja(lineaDelEsqueleto, sinTransporte.aviso)

  // «Crear» con booking y naviera: el embarque del origen nace y la unidad va en él, sin datos propios.
  const modal = await abrirElModal(page, hueco)
  await modal.getByRole('button', { name: 'Nuevo', exact: true }).click()
  await modal.getByLabel('Booking').fill(booking.toLowerCase())
  await modal.getByLabel('Naviera').selectOption({ label: terreno.naviera.nombre })
  await modal.getByRole('button', { name: 'Crear embarque' }).click()
  await expect(page.getByText(`Va en: Embarque ${booking}.`)).toBeVisible()
  const embarque = await embarqueDeLaBase(terreno.origen.id, booking)
  expect(embarque).toMatchObject({ naviera_id: terreno.naviera.id })
  expect(await transporteDe(terreno.enFase.id)).toMatchObject({
    embarque_id: embarque?.id,
    contenedor_id: null,
    booking,
  })
  // Lo del embarque se muestra, no es campo: la naviera como texto y el enlace a su página.
  await expect(hueco.getByText(`Embarque ${booking}`)).toBeVisible()
  await expect(hueco.getByText(terreno.naviera.nombre)).toBeVisible()
  await expect(hueco.getByLabel('Naviera')).toHaveCount(0)
  await expect(hueco.getByLabel('ETA')).toHaveCount(0)
  await expect(hueco.getByRole('link', { name: 'Editar el embarque' })).toHaveAttribute(
    'href',
    new RegExp(`/logistica/embarques/${embarque?.id}`),
  )
  // Sola en su embarque: la línea queda vacía, con su alto.
  await expect(hueco.locator('[data-aviso-del-transporte]')).toHaveText('')
  const sola = await medirElFormulario(page, hueco)

  // El otro vehículo lo elige de la lista (los primeros diez del origen).
  const otro = await abrirElHueco(page, terreno.sinFase.id)
  const elegir = await abrirElModal(page, otro)
  await elegir.getByRole('radio', { name: new RegExp(booking) }).check()
  await elegir.getByRole('button', { name: 'Elegir', exact: true }).click()
  await expect(page.getByText(`Va en: Embarque ${booking}.`)).toBeVisible()
  await expect(otro.getByText(AVISO_DE_LOS_DOS)).toBeVisible()
  expect(await transporteDe(terreno.sinFase.id)).toMatchObject({ embarque_id: embarque?.id })

  // De vuelta en el primero, el aviso dice a cuántos les cambia, sin mover el formulario.
  const primero = await abrirElHueco(page, terreno.enFase.id)
  await expect(primero.getByText(AVISO_DE_LOS_DOS)).toBeVisible()
  const conAviso = await medirElFormulario(page, primero)
  mismaCaja(conAviso.aviso, sola.aviso)
  mismaCaja(conAviso.notas, sola.notas)
})
