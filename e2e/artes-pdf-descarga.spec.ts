// @sin-celular-archivo: el editor de artes es una herramienta de escritorio y desde 1024 px de ancho no se dibuja en el celular
import { textoDelPdf } from '../scripts/pdf/texto-del-pdf'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarVehiculosPorTitulo,
  crearVehiculoConVin,
  textosDelLienzo,
} from './soporte/artes-con-datos'
import {
  abrirElEditorDeArtes,
  borrarPlantillasDeArte,
  sembrarPlantillaDeArte,
  subastaDeLaSemilla,
} from './soporte/artes-editor'
import {
  bajarElPdfDelEditor,
  botonDelPdf,
  elegirElVehiculo,
  paginaConDatos,
  textoEn,
} from './soporte/artes-pdf'
import { admin, borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { leerLaDescarga, pedirElPdf } from './soporte/cotizar-pdf'
import { borrarFotosDe } from './soporte/fotos'
import { comoPersona } from './soporte/flujos-recorrido'
import { encenderElLive } from './soporte/live'
import { esperarLaGuardadaHidratada, lineaAlAbrir } from './soporte/menu-de-la-guardada'
import { expect, test, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'
import { sembrarFotos } from './soporte/vehiculos-lista'

// «Descargar PDF» de una plantilla de arte en A4 (docs/UX.md › «Editor de artes»): lo que se ve, con el vehículo de ejemplo elegido (sin VIN,
// con una foto y una cotización) y el Modo Live encendido, baja un PDF de dos páginas con texto real: las líneas en orden, sin la de «VIN:», el
// total con su moneda (un PDF se manda) y la foto. Sin red, el botón se apaga y dice por qué. Puesta por defecto para PDF, «Descargar PDF» de
// la cotización baja ese arte con los datos de la cotización (`X-Pdf-Arte`); sin ella, el PDF de hoy. Una foto que ya no está en el bucket: el
// PDF sale sin ella y lo avisa. Sobre la subasta de la semilla.
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 800 } })

const FIJO = 'E2E Condiciones de la página dos'

let duena = ''
let nombre = ''
let plantilla = ''
let origen = { id: '', nombre: '' }
let vehiculo = { id: '', titulo: '' }
let cotizacion = { id: '', numero: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  nombre = `E2E Arte en PDF descarga ${proyecto}`
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  origen = {
    id: subastaDeLaSemilla(),
    nombre: sql("select nombre from public.origenes where clave = 'subasta_usa'"),
  }
  vehiculo = { id: '', titulo: `Ranger Sin Vin ${proyecto}` }
  borrarVehiculosPorTitulo([vehiculo.titulo])
  duena = correoDePrueba(`duena-arte-pdf-bajar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Petra Pdf' })
  vehiculo.id = crearVehiculoConVin(origen.id, vehiculo.titulo, null)
  await sembrarFotos(vehiculo.id, 1)
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculo.id,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  const [id = '', numero = ''] = sql(
    `select id || '|' || numero from public.cotizaciones where vehiculo_id = ${literal(vehiculo.id)}::uuid`,
  ).split('|')
  cotizacion = { id, numero }
  plantilla = sembrarPlantillaDeArte({
    nombre,
    autorId: idDePersona(duena),
    formato: 'a4',
    paginas: [paginaConDatos(), [textoEn('fijo', FIJO, { x: 40, y: 60, ancho: 515, alto: 30 })]],
  })
})

test.afterAll(async () => {
  await borrarFotosDe([vehiculo.id])
  borrarVehiculosPorTitulo([vehiculo.titulo])
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
})

async function abrirConElVehiculo(page: Page) {
  await abrirElEditorDeArtes(page, plantilla)
  await elegirElVehiculo(page, origen.nombre, vehiculo)
  await expect.poll(() => textosDelLienzo(page)).toContainEqual(expect.stringContaining('Total: '))
}

const lineasDe = (bytes: Buffer) => textoDelPdf(new Uint8Array(bytes))

test('E2E «Descargar PDF» baja lo que se ve, con el vehículo elegido y el Live: dos páginas con texto real', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/artes')
  await encenderElLive(page)
  await abrirConElVehiculo(page)
  const delLienzo = (await textosDelLienzo(page)).flatMap((texto) => texto.split('\n'))
  const totalDelLienzo = delLienzo.find((linea) => linea.startsWith('Total: ')) ?? ''
  expect(delLienzo).not.toContainEqual(expect.stringContaining('VIN:'))

  const { nombre: archivo, bytes } = await bajarElPdfDelEditor(page)
  expect(archivo).toMatch(/\.pdf$/)
  const leido = lineasDe(bytes)
  expect(leido.paginas).toHaveLength(2)
  const [titulo, total, ...resto] = leido.paginas[0]?.lineas ?? []
  expect(titulo).toBe(vehiculo.titulo)
  expect(resto).toEqual([])
  // Con el Live, el lienzo escribe el total sin su moneda; el PDF, con ella (un PDF se manda).
  expect(total).not.toBe(totalDelLienzo)
  expect(total).toContain(totalDelLienzo.slice('Total: '.length))
  expect(total?.slice('Total: '.length)).toMatch(/\p{L}|\$/u)
  expect(leido.paginas[1]?.lineas).toEqual([FIJO])
  expect(leido.imagenes).toBe(1)
})

test('E2E sin red «Descargar PDF» se apaga y dice por qué', async ({ page, context }) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await expect(botonDelPdf(page)).toBeEnabled()
  await context.setOffline(true)
  await expect(botonDelPdf(page)).toBeDisabled()
  await expect(botonDelPdf(page)).toHaveAccessibleDescription('No hay conexión.')
  await context.setOffline(false)
  await expect(botonDelPdf(page)).toBeEnabled()
})

test('E2E puesta por defecto para PDF, la cotización baja ese arte con sus datos; sin ella, el PDF de hoy', async ({
  page,
}) => {
  comoPersona(
    duena,
    `select public.artes_por_defecto_poner(${literal(origen.id)}::uuid, 'pdf', ${literal(plantilla)}::uuid, null)`,
  )
  await entrar(page, duena)
  await page.goto(`/cotizaciones/${cotizacion.id}`)
  await esperarLaGuardadaHidratada(page)
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    (await lineaAlAbrir(page, 'Descargar PDF')).click(),
  ])
  const bajado = await leerLaDescarga(descarga)
  expect(bajado.nombre).toBe(`cotizacion-${cotizacion.numero}.pdf`)
  expect(bajado.lineas[0]).toBe(vehiculo.titulo)
  expect(bajado.lineas[1]).toMatch(/^Total: /)
  expect(bajado.lineas).toContain(FIJO)
  expect((await pedirElPdf(page, cotizacion.id)).headers()['x-pdf-arte']).toBe(plantilla)

  comoPersona(
    duena,
    `select public.artes_por_defecto_poner(${literal(origen.id)}::uuid, 'pdf', null,
       (select d.actualizado_en from public.artes_por_defecto d
         where d.usuario_id = (select auth.uid()) and d.origen_id = ${literal(origen.id)}::uuid and d.tipo = 'pdf'))`,
  )
  const deHoy = await pedirElPdf(page, cotizacion.id)
  expect(deHoy.status()).toBe(200)
  expect(deHoy.headers()['x-pdf-arte']).toBe('de-hoy')
  // La tarjeta de lo guardado, en una sola página.
  const paginas = lineasDe(await deHoy.body()).paginas
  expect(paginas).toHaveLength(1)
  expect(paginas[0]?.lineas).not.toContain(FIJO)
})

test('E2E una foto que ya no está en el bucket: el PDF sale sin ella y lo avisa', async ({
  page,
}) => {
  const ruta = sql(
    `select ruta from public.vehiculos_imagenes where vehiculo_id = ${literal(vehiculo.id)}::uuid`,
  )
  expect((await admin().storage.from('vehiculos').remove([ruta])).error).toBeNull()
  await entrar(page, duena)
  await abrirConElVehiculo(page)
  const { bytes } = await bajarElPdfDelEditor(page)
  expect(lineasDe(bytes).imagenes).toBe(0)
  await expect(page.getByText('El PDF salió sin 1 imagen que no cargó.')).toBeVisible()
})
