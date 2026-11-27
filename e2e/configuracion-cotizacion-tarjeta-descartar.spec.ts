import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import {
  abrirDescartarLaTarjeta,
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  comoTexto,
  crearConfiguradoraDeTarjeta,
  cuadriculaValida,
  limpiarTerrenoDePlantilla,
  plantillaPublicada,
  prepararTerrenoDePlantilla,
  publicarPlantillaDeLaMini,
  sembrarBorradorDePlantilla,
  type TerrenoDePlantilla,
  conLaInformacionDeLaTarjeta,
} from './soporte/plantilla'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve un aviso y la tarjeta en sólo lectura

// Descartar el borrador de la tarjeta (T325): «Descartar borrador…», en el «⋯» de los botones, abre `?panel=descartar-plantilla`; cancelar, Esc y «atrás» no borran;
// confirmar borra el borrador y deja la publicada; el PT409 de la base (otra persona guardó o descartó) se dice tal cual y no borra; por la URL, sin borrador no abre.
// La marca de archivo no deja medir (el editor es de escritorio): la prueba del celular (blancos táctiles y sin scroll horizontal) salió.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjdes')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjdes', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

async function abrirTarjeta(page: Page, extra = '') {
  await entrar(page, configuradora, { fresco: true })
  await abrirLaFormula(page, origenId(), 'tarjeta', extra)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const masAcciones = (page: Page) => page.getByRole('button', { name: 'Más acciones de la tarjeta' })
const dialogo = (page: Page) =>
  page.getByRole('dialog', { name: /^Descartar el borrador de la tarjeta de / })
const confirmar = (page: Page) =>
  dialogo(page).getByRole('button', { name: 'Descartar borrador', exact: true })

test('E7: cancelar, Esc y «atrás» no borran; confirmar borra el borrador y la publicada no cambia', async ({
  page,
}) => {
  publicarPlantillaDeLaMini(origenId(), cuadriculaValida('publicada'))
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('borrador'))
  await abrirTarjeta(page)
  await abrirDescartarLaTarjeta(page)
  await expect(page).toHaveURL(/panel=descartar-plantilla/)
  await expect(dialogo(page)).toBeVisible()
  await expect(
    dialogo(page).getByText(/Guardado el .*Se borra y no se puede deshacer/),
  ).toBeVisible()
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo(page)).toHaveCount(0)
  await abrirDescartarLaTarjeta(page)
  await expect(dialogo(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toHaveCount(0)
  await abrirDescartarLaTarjeta(page)
  await expect(dialogo(page)).toBeVisible()
  await page.goBack()
  await expect(dialogo(page)).toHaveCount(0)
  expect(borradorGuardado(origenId())).not.toBeNull()
  // Confirmar.
  await abrirDescartarLaTarjeta(page)
  await confirmar(page).click()
  await expect(page.getByText('Se descartó el borrador.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await conLaInformacionDeLaTarjeta(page, async (modal) => {
    await expect(modal.getByText(/Sin borrador: parte de la versión 1 publicada\./)).toBeVisible()
  })
  // Sin borrador no hay «⋯» (sólo lleva «Descartar borrador…»).
  await expect(masAcciones(page)).toHaveCount(0)
  expect(borradorGuardado(origenId())).toBeNull()
  expect(comoTexto(plantillaPublicada(origenId())?.definicion)).toContain('Título publicada')
})

test('E8: un PT409 porque otra persona guardó no borra y «Recargar» lo quita al llegar; si otra descartó, dice que ya no está', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e8'))
  await abrirTarjeta(page)
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).guardar({
    origenId: origenId(),
    // La otra persona escribe en la fórmula de trabajo, la única del origen.
    formulaDelOrigenId: null,
    esperada,
    definicion: cuadriculaValida('de la otra persona'),
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await abrirDescartarLaTarjeta(page)
  await confirmar(page).click()
  await expect(dialogo(page).getByText(/El borrador de esta plantilla cambió/)).toBeVisible()
  await expect(confirmar(page)).toBeDisabled()
  expect(borradorGuardado(origenId())).not.toBeNull()
  await dialogo(page)
    .getByRole('button', { name: /^Recargar$/ })
    .click()
  await expect(dialogo(page).getByText(/El borrador de esta plantilla cambió/)).toHaveCount(0)
  await expect(confirmar(page)).toBeEnabled()
  // Otra persona descarta antes de confirmar.
  const nueva = borradorGuardado(origenId())?.actualizadoEn
  if (!nueva) throw new Error('No hay borrador.')
  const borrada = await plantillaSobre(terreno.duena).descartar({
    origenId: origenId(),
    // La otra persona escribe en la fórmula de trabajo, la única del origen.
    formulaDelOrigenId: null,
    esperada: nueva,
  })
  if (!borrada.ok) throw new Error(borrada.error.mensaje)
  await confirmar(page).click()
  await expect(dialogo(page).getByText(/El borrador ya no está: se descartó/)).toBeVisible()
  await dialogo(page)
    .getByRole('button', { name: /^Recargar$/ })
    .click()
  await expect(
    dialogo(page).getByText('El borrador ya no está: otra persona lo publicó o lo descartó.'),
  ).toBeVisible()
  await expect(confirmar(page)).toBeDisabled()
})

test('E9: por la URL, sin borrador no abre y limpia; con borrador, el «⋯» lo abre', async ({
  page,
}) => {
  await abrirTarjeta(page, '?panel=descartar-plantilla')
  await expect(page.getByText('No hay borrador para descartar.')).toBeVisible()
  await expect(dialogo(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e9'))
  await page.reload()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await abrirDescartarLaTarjeta(page)
  await expect(dialogo(page)).toBeVisible()
  await expect(confirmar(page)).toBeEnabled()
})
