import type { PlantillaEnCuadricula } from '../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { abrirLaVistaPrevia, tarjeta } from './soporte/cotizar-vista-previa'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { abrirElPanel, cerrarElPanel, sembrarBorradorDePlantilla } from './soporte/plantilla'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { copiarLaFormulaDeLaSubasta, crearVehiculo } from './soporte/tarjeta-cuadricula'

// @sin-celular-archivo: el editor no existe bajo 1.024 px; por debajo, un aviso y la tarjeta en sólo lectura

// Las condiciones de la tarjeta (glosario: «Lista de respaldo», «Condiciones de la tarjeta»; `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): en el editor,
// el título pasa a «El primero con valor» [Título de la cotización, Vehículo], una leyenda a «Según condiciones» (si el remate es mayor que 2000, «Remate alto»)
// y la fila del remate se oculta según condiciones (si es menor que 1000); se guarda y publica. Tres guardadas sembradas por SQL lo muestran: el título manual
// sin vehículo, el título manual con vehículo y, sin título manual, el del vehículo (`tituloDeLaTarjeta()` ya cae a él: el salto real a `vehiculo_titulo` lo
// prueba la geometría); la fila y la leyenda según su remate. Un origen propio con una copia de la fórmula v1 de `subasta_usa`, nunca la de la semilla.
test.describe.configure({ mode: 'serial' })

const RAIZ = 'tjcond_'
const NOMBRE_DE_LA_DUENA = 'Celia Condiciones'

// Un título, el remate (etiqueta y monto), una leyenda vacía y el total.
const PARTIDA: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [
    { id: 'concepto', ancho: 200 },
    { id: 'monto', ancho: 140 },
  ],
  filas: [
    { id: 'f_titulo', alto: 28, ocultar_si: 'nunca' },
    { id: 'f_remate', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_aviso', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_total', alto: 28, ocultar_si: 'nunca' },
  ],
  celdas: [
    {
      id: 'c_titulo',
      fila: 'f_titulo',
      columna: 'concepto',
      abarca_columnas: 2,
      contenido: { tipo: 'texto', texto: 'Cotización' },
    },
    {
      id: 'c_remate',
      fila: 'f_remate',
      columna: 'concepto',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' },
    },
    {
      id: 'c_remate_monto',
      fila: 'f_remate',
      columna: 'monto',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' },
    },
    {
      id: 'c_aviso',
      fila: 'f_aviso',
      columna: 'concepto',
      abarca_columnas: 2,
      contenido: { tipo: 'texto', texto: '' },
    },
    {
      id: 'c_total',
      fila: 'f_total',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'TOTAL' },
    },
    {
      id: 'c_total_monto',
      fila: 'f_total',
      columna: 'monto',
      contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
    },
  ],
}

let duena = ''
let origen = ''
let tituloDelVehiculo = ''
// Las tres guardadas: sin vehículo y con título manual (remate bajo), con vehículo y título manual, con vehículo y sin título manual (remate alto).
const guardadas = { sinVehiculo: '', manual: '', delVehiculo: '' }

const misOrigenes = () =>
  `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`

function borrarLoDeEsteSpec(): void {
  sql(`
    delete from public.cotizaciones where origen_id in (${misOrigenes()});
    delete from public.vehiculos where origen_id in (${misOrigenes()});
    delete from public.origenes where id in (${misOrigenes()})`)
}

// Una guardada sembrada con su título (manual o el del vehículo) y su remate.
function sembrarUna(datos: {
  vehiculo: string | null
  titulo: string
  manual: boolean
  remate: number
  desde: number
}): string {
  const antes = sql(`select coalesce(string_agg(id::text, ','), '') from public.cotizaciones
    where origen_id = ${literal(origen)}::uuid`)
  sembrarCotizaciones({
    origenId: origen,
    vehiculoId: datos.vehiculo,
    creadoPor: idDePersona(duena),
    cuantas: 1,
    desde: datos.desde,
  })
  const id = sql(`select id from public.cotizaciones where origen_id = ${literal(origen)}::uuid
    and not (id::text = any (string_to_array(${literal(antes)}, ',')))`)
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones
       set titulo = ${literal(datos.titulo)}, titulo_manual = ${String(datos.manual)},
           valores = valores || jsonb_build_object('remate', ${String(datos.remate)})
     where id = ${literal(id)}::uuid;
    commit;`)
  return id
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  duena = correoDePrueba(`duena-tjcond-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE_DE_LA_DUENA })
  origen = (
    await crearOrigenDePrueba(`E2E condiciones ${proyecto}`, `${RAIZ}${proyecto}`, {
      tipo: 'subasta',
    })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  const vehiculo = await crearVehiculo(origen, `Condiciones Hilux ${proyecto}`)
  tituloDelVehiculo = sql(
    `select titulo from public.vehiculos where id = ${literal(vehiculo)}::uuid`,
  )
  // La más nueva (la referencia del lienzo) es la del remate bajo.
  guardadas.sinVehiculo = sembrarUna({
    vehiculo: null,
    titulo: 'Importación especial',
    manual: true,
    remate: 500,
    desde: 0,
  })
  guardadas.manual = sembrarUna({
    vehiculo,
    titulo: 'Para la familia Rocha',
    manual: true,
    remate: 5000,
    desde: 10,
  })
  guardadas.delVehiculo = sembrarUna({
    vehiculo,
    titulo: tituloDelVehiculo,
    manual: false,
    remate: 5000,
    desde: 20,
  })
  sembrarBorradorDePlantilla(origen, PARTIDA)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarPersonasDePrueba()
})

const panelDe = (page: Page) => page.getByRole('complementary', { name: 'Panel de la tarjeta' })
const casilla = (page: Page, f: number, k: number) =>
  page
    .getByRole('grid', { name: 'Lienzo de la tarjeta' })
    .locator(`[data-pos="${String(f)}:${String(k)}"]`)

async function elegirComoDato(page: Page, f: number, cual: string) {
  await casilla(page, f, 0).click()
  await expect(casilla(page, f, 0)).toHaveAttribute('aria-selected', 'true')
  const panel = await abrirElPanel(page, 'Celda')
  await panel
    .getByRole('radiogroup', { name: 'Contenido' })
    .getByRole('radio', { name: 'Dato' })
    .click()
  await panel
    .getByRole('radiogroup', { name: 'Cuál dato' })
    .getByRole('radio', { name: cual })
    .click()
}

function definicion(estado: 'borrador' | 'publicada'): string {
  return sql(`select coalesce(definicion::text, '') from public.plantillas_tarjeta
    where origen_id = ${literal(origen)}::uuid and estado = ${literal(estado)}`)
}

test('E2E armar una lista de respaldo, unas condiciones y ocultar una fila según condiciones; guardar y publicar', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen}/tarjeta`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  const panel = panelDe(page)

  // El título: «El primero con valor» con el título de la cotización y, si no, el vehículo. A medio armar, la celda no cambia.
  await elegirComoDato(page, 0, 'El primero con valor')
  const lista = panel.locator('[data-lista-de-respaldo]')
  await expect(lista.getByText('Sin terminar: la celda no cambia hasta completarla.')).toBeVisible()
  await lista
    .getByRole('group', { name: 'Dato 1' })
    .getByRole('button', { name: 'Elegir el dato' })
    .click()
  const deLaCotizacion = lista.getByRole('region', { name: 'De la cotización' })
  await deLaCotizacion.getByRole('button', { name: 'Título de la cotización', exact: true }).click()
  await lista
    .getByRole('group', { name: 'Dato 2' })
    .getByRole('button', { name: 'Elegir el dato' })
    .click()
  await deLaCotizacion.getByRole('button', { name: 'Vehículo', exact: true }).click()
  await lista.getByRole('button', { name: 'Listo' }).click()
  await expect(lista.getByText('Sin terminar')).toHaveCount(0)
  await expect(page.locator('[data-tarjeta-de-cotizacion] [data-celda="c_titulo"]')).toHaveText(
    'Importación especial',
  )
  await capturar(page, info, 'lista-de-respaldo')

  // La leyenda: si el remate es mayor que 2000, «Remate alto»; si no, nada.
  await elegirComoDato(page, 2, 'Según condiciones')
  const armador = panel.locator('[data-armador-de-condiciones]')
  await expect(
    armador.getByText('Sin terminar: la celda no cambia hasta completarla.'),
  ).toBeVisible()
  const rama = armador.getByRole('region', { name: 'Rama 1: Si' })
  await rama.getByLabel('Lo que mira').selectOption('n:remate')
  await rama.getByLabel('Qué pregunta').selectOption('mayor')
  await rama.getByLabel('Número', { exact: true }).fill('2000')
  await rama.getByLabel('Texto que muestra').fill('Remate alto')
  await expect(armador.getByText('Sin terminar')).toHaveCount(0)
  await expect(rama.getByRole('group', { name: /^Remate.* es mayor que 2.000$/ })).toBeVisible()
  await capturar(page, info, 'armador-de-condiciones')

  // La fila del remate: se oculta si es menor que 1000; con la referencia (remate 500), va a las ocultas.
  await page.locator('[data-asa-de-fila="f_remate"] button').click()
  await expect(panel.locator('[data-panel-de-la-fila="f_remate"]')).toBeVisible()
  await panel.getByLabel('Ocultar la fila').selectOption('condiciones')
  await expect(panel.getByLabel('El nodo que la decide')).toHaveCount(0)
  const fila = panel.locator('[data-condiciones-de-la-fila]')
  await expect(fila.getByText('Sin terminar: la fila no cambia hasta completarla.')).toBeVisible()
  await fila.getByLabel('Lo que mira').selectOption('n:remate')
  await fila.getByLabel('Qué pregunta').selectOption('menor')
  await fila.getByLabel('Número', { exact: true }).fill('1000')
  await expect(fila.getByText('Sin terminar')).toHaveCount(0)
  await expect(
    page.locator('[data-ocultas-con-esta-referencia] [data-oculta="f_remate"]'),
  ).toContainText('Se cumplen sus condiciones')
  await capturar(page, info, 'condiciones-de-la-fila')

  await cerrarElPanel(page)
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect.poll(() => definicion('borrador')).toContain('"respaldo"')
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: /^Publicar la tarjeta de / })
  await modal.getByLabel('Nota de la versión').fill('Condiciones de la tarjeta')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = definicion('publicada')
  for (const parte of ['"respaldo"', '"condiciones"', '"ocultar_si": "condiciones"'])
    expect(publicada).toContain(parte)
})

async function laTarjetaDe(page: Page, id: string) {
  await page.goto(`/cotizaciones/${id}`)
  const t = await abrirLaVistaPrevia(page)
  return {
    titulo: t.locator('[data-celda="c_titulo"]'),
    aviso: t.locator('[data-celda="c_aviso"]'),
    remate: t.locator('[data-fila="f_remate"]'),
  }
}

test('E2E las guardadas muestran el primero con valor y lo que dicen sus condiciones', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })

  const sinVehiculo = await laTarjetaDe(page, guardadas.sinVehiculo)
  await expect(sinVehiculo.titulo).toHaveText('Importación especial')
  await expect(sinVehiculo.titulo).toHaveAttribute('data-variable', 'titulo')
  await expect(sinVehiculo.remate).toHaveCount(0)
  await expect(sinVehiculo.aviso).toHaveText('')

  const manual = await laTarjetaDe(page, guardadas.manual)
  await expect(manual.titulo).toHaveText('Para la familia Rocha')
  await expect(manual.remate.first()).toBeVisible()
  await expect(manual.aviso).toHaveText('Remate alto')
  await capturar(page, info, 'guardada-con-condiciones')

  const delVehiculo = await laTarjetaDe(page, guardadas.delVehiculo)
  await expect(delVehiculo.titulo).toHaveText(tituloDelVehiculo)
  await expect(delVehiculo.titulo).toHaveAttribute('data-variable', 'titulo')
  await expect(tarjeta(page).locator('[data-fila="f_remate"]').first()).toBeVisible()
})
