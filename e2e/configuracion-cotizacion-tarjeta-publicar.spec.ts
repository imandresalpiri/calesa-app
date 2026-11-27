import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import {
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  casillaDelLienzo,
  comoTexto,
  crearConfiguradoraDeTarjeta,
  cuadriculaValida,
  escribirEnLaCelda,
  limpiarTerrenoDePlantilla,
  plantillaPublicada,
  prepararTerrenoDePlantilla,
  sembrarBorradorDePlantilla,
  visibilidadDeLaMini,
  type TerrenoDePlantilla,
  conLaInformacionDeLaTarjeta,
} from './soporte/plantilla'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve un aviso y la tarjeta en sólo lectura

// Publicar la tarjeta con nota (T325): «Publicar…» abre `?panel=publicar-tarjeta`, la nota es obligatoria, lo publicado (la forma 2) se comprueba en la base; el PT409
// de la base (otra persona guardó o publicó) se dice tal cual y conserva la nota; una regla contra la fórmula se dice arriba del modal con «Ir a la celda»; por la URL,
// sin borrador no abre. La marca de archivo no deja medir (el editor es de escritorio): la prueba del celular (sin scroll horizontal, blancos táctiles) salió.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjpub')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjpub', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

// `extra` va como consulta de `urlDeLaFormula()`: la URL ya lleva `?formula=`, y pegarle otro `?` lo volvería parte del id.
async function abrirTarjeta(page: Page, extra = '') {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(urlDeLaFormula(origenId(), 'tarjeta', extra))
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const publicar = (page: Page) => page.getByRole('button', { name: 'Publicar…' })
const nota = (page: Page) => page.getByLabel('Nota de la versión')
const enElModal = (page: Page) => page.getByRole('dialog', { name: /^Publicar la tarjeta de / })
const publicarEnElModal = (page: Page) =>
  enElModal(page).getByRole('button', { name: 'Publicar', exact: true })

test('E1: «Publicar…» abre el modal, la nota es obligatoria y con ella se publica la cuadrícula', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e1'))
  await abrirTarjeta(page)
  await publicar(page).click()
  await expect(page).toHaveURL(/panel=publicar-tarjeta/)
  await expect(enElModal(page)).toBeVisible()
  await expect(enElModal(page).getByText(/Se publica el borrador guardado el /)).toBeVisible()
  // Sin nota no se publica nada.
  await publicarEnElModal(page).click()
  await expect(page.getByText('Publicar pide una nota.')).toBeVisible()
  expect(plantillaPublicada(origenId())).toBeNull()
  expect(borradorGuardado(origenId())).not.toBeNull()
  // Con nota entra.
  await nota(page).fill('Primera versión de la tarjeta')
  await publicarEnElModal(page).click()
  await expect(page.getByText('Se publicó la tarjeta.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await conLaInformacionDeLaTarjeta(page, async (modal) => {
    await expect(modal.getByRole('heading', { name: 'Publicada: versión 1' })).toBeVisible()
    await expect(modal.getByText('Primera versión de la tarjeta')).toBeVisible()
    await expect(modal.getByText(/Sin borrador: parte de la versión 1 publicada\./)).toBeVisible()
  })
  const publicada = plantillaPublicada(origenId())
  expect(publicada?.version).toBe(1)
  expect(publicada?.nota).toBe('Primera versión de la tarjeta')
  expect((publicada?.definicion as unknown as { forma?: number } | undefined)?.forma).toBe(2)
  expect(borradorGuardado(origenId())).toBeNull()
})

test('E2: «Publicar…» se apaga con su motivo a la vista; «Descartar borrador…» sólo existe con borrador', async ({
  page,
}) => {
  await abrirTarjeta(page)
  await expect(publicar(page)).toBeDisabled()
  await expect(page.getByText('Guarda un borrador para poder publicarlo.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Más acciones de la tarjeta' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect(publicar(page)).toBeEnabled()
  await page.getByRole('button', { name: 'Más acciones de la tarjeta' }).click()
  await expect(page.getByRole('menuitem', { name: 'Descartar borrador…' })).toBeVisible()
  await page.keyboard.press('Escape')
  await escribirEnLaCelda(
    page,
    page.getByRole('grid', { name: 'Lienzo de la tarjeta' }).getByRole('gridcell', {
      name: 'Cotización n.º',
      exact: true,
    }),
    'Un cambio sin guardar',
  )
  await expect(publicar(page)).toBeDisabled()
  await expect(page.getByText('Guarda los cambios para poder publicarlos.')).toBeVisible()
})

test('E3: un PT409 porque otra persona guardó se dice tal cual, conserva la nota, y «Recargar» lo quita al llegar la versión', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e3'))
  await abrirTarjeta(page)
  await publicar(page).click()
  await nota(page).fill('Mi nota')
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).guardar({
    origenId: origenId(),
    // La otra persona escribe en la fórmula de trabajo, la única del origen.
    formulaDelOrigenId: null,
    esperada,
    definicion: cuadriculaValida('de la otra persona'),
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await publicarEnElModal(page).click()
  await expect(enElModal(page).getByText(/El borrador de esta plantilla cambió/)).toBeVisible()
  await expect(enElModal(page).getByText(/La nota que escribiste sigue aquí/)).toBeVisible()
  await expect(nota(page)).toHaveValue('Mi nota')
  await expect(publicarEnElModal(page)).toBeDisabled()
  expect(plantillaPublicada(origenId())).toBeNull()
  await enElModal(page)
    .getByRole('button', { name: /^Recargar$/ })
    .click()
  await expect(enElModal(page).getByText(/El borrador de esta plantilla cambió/)).toHaveCount(0)
  // El modal sigue abierto y con la nota: la pestaña se leyó de nuevo sin remontarlo.
  await expect(enElModal(page)).toBeVisible()
  await expect(nota(page)).toHaveValue('Mi nota')
  await publicarEnElModal(page).click()
  await expect(page.getByText('Se publicó la tarjeta.')).toBeVisible()
  expect(plantillaPublicada(origenId())?.nota).toBe('Mi nota')
  expect(comoTexto(plantillaPublicada(origenId())?.definicion)).toContain(
    'Título de la otra persona',
  )
})

test('E4: un PT409 porque otra persona publicó dice que el borrador ya no está y apaga «Publicar»; la nota no se pierde', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e4'))
  await abrirTarjeta(page)
  await publicar(page).click()
  await nota(page).fill('Mi nota')
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).publicar({
    origenId: origenId(),
    // La otra persona escribe en la fórmula de trabajo, la única del origen.
    formulaDelOrigenId: null,
    esperada,
    nota: 'La de la otra persona',
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await publicarEnElModal(page).click()
  await expect(
    enElModal(page).getByText(/El borrador ya no está: la versión 1 se publicó/),
  ).toBeVisible()
  await enElModal(page)
    .getByRole('button', { name: /^Recargar$/ })
    .click()
  await expect(
    enElModal(page).getByText(/El borrador ya no está: otra persona lo publicó o lo descartó\./),
  ).toBeVisible()
  await expect(publicarEnElModal(page)).toBeDisabled()
  await expect(nota(page)).toHaveValue('Mi nota')
  expect(plantillaPublicada(origenId())?.nota).toBe('La de la otra persona')
})

test('E5: por la URL, sin borrador no abre, avisa y limpia; con borrador abre y «atrás» lo cierra', async ({
  page,
}) => {
  await abrirTarjeta(page, '?panel=publicar-tarjeta')
  await expect(page.getByText('No hay borrador para publicar.')).toBeVisible()
  await expect(enElModal(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e5'))
  await page.reload()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await publicar(page).click()
  await expect(enElModal(page)).toBeVisible()
  await page.goBack()
  await expect(enElModal(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  expect(plantillaPublicada(origenId())).toBeNull()
})

test('E6: una regla de la base contra la fórmula se dice arriba del modal; la nota queda, no se publica nada e «Ir a la celda» la elige', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e6'))
  visibilidadDeLaMini(origenId(), { fees: { ver: 'costos' } })
  await abrirTarjeta(page)
  // El editor ya avisa, pero «Publicar…» sigue activo: decide la base.
  await expect(publicar(page)).toBeEnabled()
  await publicar(page).click()
  await nota(page).fill('Mi nota')
  await publicarEnElModal(page).click()
  await expect(
    enElModal(page).getByText(
      'La tarjeta no puede mostrar lo que nombra la celda «c_fees»: no es del nivel «todos».',
    ),
  ).toBeVisible()
  await expect(nota(page)).toHaveValue('Mi nota')
  expect(plantillaPublicada(origenId())).toBeNull()
  // «Ir a la celda» cierra el modal y elige la celda de los fees (fila 2, columna A).
  await enElModal(page).getByRole('button', { name: 'Ir a la celda' }).click()
  await expect(enElModal(page)).toHaveCount(0)
  await expect(casillaDelLienzo(page, 2, 0)).toHaveAttribute('aria-selected', 'true')
})
