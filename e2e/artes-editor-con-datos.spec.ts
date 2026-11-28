// @sin-celular-archivo: el editor de artes es una herramienta de escritorio y desde 1024 px de ancho no se dibuja en el celular
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import {
  borrarVehiculosPorTitulo,
  capasConDatos,
  crearVehiculoConVin,
  imagenesDelLienzo,
  textosDelLienzo,
} from './soporte/artes-con-datos'
import {
  abrirElEditorDeArtes,
  borrarPlantillasDeArte,
  lienzoDelEditor,
  sembrarPlantillaDeArte,
  subastaDeLaSemilla,
} from './soporte/artes-editor'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { borrarFotosDe } from './soporte/fotos'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'
import { sembrarFotos } from './soporte/vehiculos-lista'

// El editor de artes con datos (docs/UX.md › «Artes»): el vehículo de ejemplo de la barra llena el lienzo con lo suyo (el título y el VIN del
// texto, su primera foto y la tarjeta de su cotización), lo que no tiene se esconde (la línea «VIN:» y la foto) y se avisa encima del lienzo; nada
// cambia de tamaño al elegir ni al pasar a «Textos». En «Textos», el texto base del origen y el Mensaje del portal (el mismo de Configuración ›
// Leads); sin `cotizaciones.configurar`, el texto base es de sólo lectura. Sobre la subasta de la semilla (con fórmula publicada): un vehículo
// con VIN, dos fotos y una cotización y otro sin nada. Al terminar, el texto base y el mensaje vuelven a lo de antes.
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 800 } })

const VIN = '1HGBH41JXMN109186'
const TEXTO_BASE = 'Mira el {vehiculo}\nVIN: {vin}'
const MENSAJE = 'Hola {cliente}, tu arte con datos te espera: código {codigo}, clave {clave}.'

let duena = ''
let sinConfigurar = ''
let plantilla = ''
let plantillaAjena = ''
let origen = { id: '', nombre: '' }
let conDatos = { id: '', titulo: '', cotizacion: '' }
let sinNada = { id: '', titulo: '' }
let textoBaseDeAntes = ''

const nombreDe = (proyecto: string) => `E2E Arte con datos ${proyecto}`

const portalDeFabrica = () => {
  sql('update public.ajustes_leads set portal_mensaje = null where id = 1')
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  const nombre = nombreDe(proyecto)
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  origen = {
    id: subastaDeLaSemilla(),
    nombre: sql("select nombre from public.origenes where clave = 'subasta_usa'"),
  }
  conDatos = { id: '', titulo: `Tacoma Datos ${proyecto}`, cotizacion: '' }
  sinNada = { id: '', titulo: `Corolla Vacio ${proyecto}` }
  borrarVehiculosPorTitulo([conDatos.titulo, sinNada.titulo])
  duena = correoDePrueba(`duena-arte-datos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Datos' })
  sinConfigurar = correoDePrueba(`ve-arte-datos-${proyecto}`)
  await crearPersona({
    email: sinConfigurar,
    contrasena: CONTRASENA,
    nombre: 'Vera Ve',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinConfigurar,
    rol: { nombre: `${PREFIJO_ROL_E2E}Arte sólo ve`, clave: 'e2e_arte_solo_ve' },
    permisos: [{ clave: 'cotizaciones.ver', origenId: origen.id }],
  })
  conDatos.id = crearVehiculoConVin(origen.id, conDatos.titulo, VIN)
  sinNada.id = crearVehiculoConVin(origen.id, sinNada.titulo, null)
  await sembrarFotos(conDatos.id, 2)
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: conDatos.id,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  conDatos.cotizacion = sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(conDatos.id)}::uuid`,
  )
  plantilla = sembrarPlantillaDeArte({
    nombre,
    autorId: idDePersona(duena),
    capas: capasConDatos('{vehiculo}\nVIN: {vin}'),
  })
  plantillaAjena = sembrarPlantillaDeArte({
    nombre: `${nombre} ajena`,
    autorId: idDePersona(sinConfigurar),
  })
  textoBaseDeAntes = sql(
    `select texto from public.artes_textos_base where origen_id = ${literal(origen.id)}::uuid`,
  )
  portalDeFabrica()
})

test.afterAll(async ({}, info) => {
  sql(`update public.artes_textos_base set texto = ${literal(textoBaseDeAntes)}
         where origen_id = ${literal(origen.id)}::uuid`)
  portalDeFabrica()
  await borrarFotosDe([conDatos.id])
  borrarVehiculosPorTitulo([conDatos.titulo, sinNada.titulo])
  borrarPlantillasDeArte(nombreDe(info.project.name))
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function cajaDe(lugar: Locator) {
  const caja = await lugar.boundingBox()
  if (!caja) throw new Error('sin caja')
  return caja
}

const disparador = (page: Page) => page.locator('[data-vehiculo-de-ejemplo-disparador]')
const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' })
const avisoDeLoQueFalta = (page: Page) =>
  page.getByText(/^A esta plantilla le faltan datos con este vehículo: /)

async function cajas(page: Page) {
  return {
    lienzo: await cajaDe(lienzoDelEditor(page)),
    barra: await cajaDe(page.locator('header').first()),
    inspector: await cajaDe(inspector(page)),
  }
}

async function elegirVehiculo(page: Page, vehiculo: { id: string; titulo: string }) {
  await disparador(page).click()
  const popover = page.getByRole('dialog', { name: 'Vehículo de ejemplo' })
  await expect(popover).toBeVisible()
  await popover.getByLabel(`Buscar en ${origen.nombre}`).fill(vehiculo.titulo)
  await popover.locator(`[data-vehiculo-de-ejemplo="${vehiculo.id}"]`).click()
  await expect(disparador(page)).toContainText(`Vehículo de ejemplo: ${vehiculo.titulo}`)
  await expect(popover.getByText('Leyendo el vehículo…')).toBeHidden()
  return popover
}

async function cerrar(page: Page, popover: Locator) {
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
}

test('E2E el vehículo de ejemplo llena el lienzo, esconde lo que no tiene y nada salta', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await expect(disparador(page)).toContainText('Datos de ejemplo')
  const antes = await cajas(page)

  // Sin VIN, sin fotos y sin cotizaciones: la línea «VIN:» y la foto se esconden y el aviso lo dice.
  let popover = await elegirVehiculo(page, sinNada)
  await expect(popover.getByLabel('Cotización')).toContainText('Sin cotizaciones de este vehículo')
  await cerrar(page, popover)
  await expect(avisoDeLoQueFalta(page)).toContainText('VIN')
  await expect.poll(() => textosDelLienzo(page)).toContain(sinNada.titulo)
  expect((await textosDelLienzo(page)).some((texto) => texto.includes('VIN:'))).toBe(false)
  expect((await imagenesDelLienzo(page)).some((src) => src.includes('/artes/fotos/'))).toBe(false)
  expect(await cajas(page)).toEqual(antes)

  // Otro vehículo: su título y su VIN, su primera foto y la tarjeta de su cotización (la primera, elegida de entrada).
  popover = await elegirVehiculo(page, conDatos)
  await expect(popover.getByLabel('Cotización')).toContainText('Sembrada 1')
  await cerrar(page, popover)
  await expect.poll(() => textosDelLienzo(page)).toContain(`${conDatos.titulo}\nVIN: ${VIN}`)
  await expect
    .poll(() => imagenesDelLienzo(page))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(`^/artes/fotos/${conDatos.id}/`)),
        `/cotizaciones/${conDatos.cotizacion}/imagen`,
      ]),
    )
  await expect(avisoDeLoQueFalta(page)).toBeHidden()
  expect(await cajas(page)).toEqual(antes)

  await page.getByRole('tab', { name: 'Textos', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Textos', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(await cajas(page)).toEqual(antes)
})

test('E2E el texto base se edita junto al lienzo, con la vista previa del vehículo, y sigue al recargar', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await cerrar(page, await elegirVehiculo(page, conDatos))
  await page.getByRole('tab', { name: 'Textos', exact: true }).click()
  const seccion = page.getByRole('region', { name: `Texto base de ${origen.nombre}` })
  const campo = seccion.getByLabel('Texto al compartir')
  await campo.fill(TEXTO_BASE)
  await expect(
    seccion.getByRole('group', { name: `Vista previa con ${conDatos.titulo}` }),
  ).toHaveText(`Mira el ${conDatos.titulo}\nVIN: ${VIN}`)
  await seccion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(seccion.getByText('Guardado.')).toBeVisible()

  // Al volver: lo guardado, y el vehículo elegido, que se recuerda por plantilla en este navegador.
  await abrirElEditorDeArtes(page, plantilla)
  await expect(disparador(page)).toContainText(`Vehículo de ejemplo: ${conDatos.titulo}`)
  await page.getByRole('tab', { name: 'Textos', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: `Texto base de ${origen.nombre}` })
      .getByLabel('Texto al compartir'),
  ).toHaveValue(TEXTO_BASE)
})

test('E2E el mensaje del portal se cambia en «Textos» y es el mismo de Configuración › Leads', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await page.getByRole('tab', { name: 'Textos', exact: true }).click()
  const seccion = page.getByRole('region', { name: 'Mensaje del portal', exact: true })
  await seccion.getByLabel('Texto para WhatsApp').fill(MENSAJE)
  await seccion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(seccion.getByText('Guardado.')).toBeVisible()

  await page.goto('/configuracion/leads')
  await expect(page.getByRole('region', { name: 'Mensaje del portal', exact: true })).toContainText(
    'tu arte con datos te espera',
  )
})

test('E2E sin cotizaciones.configurar el texto base es de sólo lectura y sin vehiculos.ver no se elige un vehículo', async ({
  page,
}) => {
  await entrar(page, sinConfigurar)
  await abrirElEditorDeArtes(page, plantillaAjena)
  const apagado = page.getByRole('button', { name: 'Datos de ejemplo', exact: true })
  await expect(apagado).toBeDisabled()
  await expect(apagado).toHaveAccessibleDescription(
    `No ves los vehículos de ${origen.nombre}: el arte usa los datos de ejemplo.`,
  )
  await page.getByRole('tab', { name: 'Textos', exact: true }).click()
  const seccion = page.getByRole('region', { name: `Texto base de ${origen.nombre}` })
  await expect(seccion.getByLabel('Texto al compartir')).toBeDisabled()
  await expect(seccion).toContainText(
    `Sólo quien configura cotizaciones en ${origen.nombre} cambia este texto.`,
  )
  await expect(page.getByRole('region', { name: 'Mensaje del portal', exact: true })).toContainText(
    'Sólo quien configura Leads cambia este mensaje.',
  )
})
