// @sin-celular-archivo: el editor de artes es una herramienta de escritorio y desde 1024 px de ancho no se dibuja en el celular
import { FUENTE_DEL_PDF, METRICAS_DE_GEIST } from '../src/modules/artes/entities/editor/fuentes'
import { formatearPorcentaje } from '../src/shared/lib/formato'
import { CONTRASENA, entrar } from './soporte/alta'
import { imagenesDelLienzo, textosDelLienzo } from './soporte/artes-con-datos'
import {
  abrirElEditorDeArtes,
  borrarPlantillasDeArte,
  sembrarPlantillaDeArte,
} from './soporte/artes-editor'
import { bajarElPdfDelEditor, exportarLaPaginaEnPng, paginaConDatos } from './soporte/artes-pdf'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import {
  abrirElRasterizador,
  diferenciaConElLienzo,
  metricasEnElNavegador,
} from './soporte/rasterizar-el-pdf'
import { capturar } from './soporte/recorrido'
import { expect, test, type Page } from './soporte/prueba'

// El PDF de un arte se ve como su lienzo (docs/DECISIONES.md › Artes): con los datos de ejemplo, la página 1 exportada en PNG desde el editor y
// la misma página del PDF dibujada con pdfjs-dist al mismo tamaño, reducidas a la mitad, difieren en menos de `UMBRAL` de los píxeles (algún
// canal más de `CANAL`). El control: con el texto 2 pt más grande, el PDF ya no se parece. Y la «Geist del PDF» del navegador mide el ascenso y
// el descenso con que el servidor ubica cada línea.
test.use({ viewport: { width: 1280, height: 800 } })

// Calibrado una vez con esta plantilla; nunca se sube de 3 %.
const UMBRAL = 0.015
const CANAL = 48

let duena = ''
let nombre = ''
let plantilla = ''
let grande = ''

test.beforeAll(async ({}, info) => {
  nombre = `E2E Arte en PDF contra el lienzo ${info.project.name}`
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-arte-pdf-lienzo-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lina Lienzo' })
  const autorId = idDePersona(duena)
  plantilla = sembrarPlantillaDeArte({
    nombre,
    autorId,
    formato: 'a4',
    paginas: [paginaConDatos()],
  })
  grande = sembrarPlantillaDeArte({
    nombre: `${nombre} grande`,
    autorId,
    formato: 'a4',
    paginas: [paginaConDatos(24)],
  })
})

test.afterAll(async () => {
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
})

// El editor con todo dibujado: el texto con los datos de ejemplo y la foto de ejemplo ya cargada.
async function abrirDibujado(page: Page, id: string) {
  await abrirElEditorDeArtes(page, id)
  await expect.poll(() => textosDelLienzo(page)).toContainEqual(expect.stringContaining('Total: '))
  await expect
    .poll(() => imagenesDelLienzo(page))
    .toContainEqual(expect.stringMatching(/^\/artes\/ejemplo\//))
}

test('E2E el PDF de un arte se ve como su lienzo, y la Geist del navegador mide lo mismo que el servidor', async ({
  page,
  context,
}, info) => {
  await entrar(page, duena)
  await abrirDibujado(page, plantilla)
  const metricas = await metricasEnElNavegador(page, FUENTE_DEL_PDF.familia)
  expect(metricas.cargada).toBe(true)
  expect(metricas.ascenso).toBeCloseTo(METRICAS_DE_GEIST.ascenso, 2)
  expect(metricas.descenso).toBeCloseTo(METRICAS_DE_GEIST.descenso, 2)
  const png = await exportarLaPaginaEnPng(page, nombre)
  const { bytes: pdf } = await bajarElPdfDelEditor(page)
  await abrirDibujado(page, grande)
  const { bytes: pdfGrande } = await bajarElPdfDelEditor(page)

  const rasterizador = await context.newPage()
  await abrirElRasterizador(rasterizador)
  const conElGrande = await diferenciaConElLienzo(rasterizador, {
    png,
    pdf: pdfGrande,
    canal: CANAL,
  })
  const diferencia = await diferenciaConElLienzo(rasterizador, { png, pdf, canal: CANAL })
  await capturar(rasterizador, info, 'lienzo-y-pdf')
  const enPorcentaje = (fraccion: number) => formatearPorcentaje(fraccion, { decimales: 2 })
  const medida = `difieren ${enPorcentaje(diferencia)} de los píxeles; con el texto 2 pt más grande, ${enPorcentaje(conElGrande)}`
  console.warn(`[artes-pdf] ${info.project.name}: ${medida}`)
  info.annotations.push({ type: 'PDF contra el lienzo', description: medida })
  expect(diferencia).toBeLessThan(UMBRAL)
  expect(conElGrande).toBeGreaterThan(UMBRAL)
})
