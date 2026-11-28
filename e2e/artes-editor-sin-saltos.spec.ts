import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import {
  abrirCapas,
  abrirElEditorDeArtes,
  borrarPlantillasDeArte,
  elegirEnCapas,
  escribirUnTexto,
  lienzoDelEditor,
  sembrarPlantillaDeArte,
} from './soporte/artes-editor'
import { expect, test, type Locator } from './soporte/prueba'

// Sin saltos en el editor de artes (`.claude/rules/ui.md`): la caja del lienzo es la misma mientras se escribe un texto encima, al elegirlo en
// «Capas» y al cambiar entre «Agregar» y «Capas» (las columnas tienen ancho fijo). Va aparte de `artes-editor.spec.ts`, que no corre en el
// celular: acá el ancho es fijo de escritorio y corre en los dos proyectos, como `artes-editor-aviso.spec.ts`.
test.use({ viewport: { width: 1280, height: 800 } })

const TEXTO = 'E2E Quieto'

let duena = ''
let plantilla = ''
let nombre = ''

test.beforeAll(async ({}, info) => {
  nombre = `E2E Arte sin saltos ${info.project.name}`
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-arte-quieto-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Quena Quieta' })
  plantilla = sembrarPlantillaDeArte({ nombre, autorId: idDePersona(duena) })
})

test.afterAll(async () => {
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
})

async function cajaDe(lugar: Locator) {
  const caja = await lugar.boundingBox()
  if (!caja) throw new Error('sin caja')
  return caja
}

test('E2E la caja del lienzo no cambia al escribir, elegir ni cambiar de pestaña', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  const lienzo = lienzoDelEditor(page)
  const inicial = await cajaDe(lienzo)
  await escribirUnTexto(page, TEXTO, { x: 300, y: 300 }, async () => {
    expect(await cajaDe(lienzo)).toEqual(inicial)
  })
  expect(await cajaDe(lienzo)).toEqual(inicial)
  await abrirCapas(page)
  expect(await cajaDe(lienzo)).toEqual(inicial)
  await elegirEnCapas(page, `Texto · ${TEXTO}`)
  expect(await cajaDe(lienzo)).toEqual(inicial)
  await page.getByRole('tab', { name: 'Agregar', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Agregar', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(await cajaDe(lienzo)).toEqual(inicial)
})
