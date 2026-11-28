import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import { borrarPlantillasDeArte, sembrarPlantillaDeArte } from './soporte/artes-editor'
import { expect, test } from './soporte/prueba'

// El editor de artes es de escritorio (desde 1024 px): más angosto, `/artes/<id>` dice que se usa en una computadora, ofrece «Volver» a Artes y
// no pide el código del editor (ni Konva). Va aparte de `artes-editor.spec.ts` (marcado sin celular): acá el ancho es fijo y corre en los dos
// proyectos.
test.use({ viewport: { width: 800, height: 900 } })

let duena = ''
let plantilla = ''
let nombre = ''

test.beforeAll(async ({}, info) => {
  nombre = `E2E Arte angosto ${info.project.name}`
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-arte-angosto-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Angosta' })
  plantilla = sembrarPlantillaDeArte({ nombre, autorId: idDePersona(duena) })
})

test.afterAll(async () => {
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
})

test('E2E más angosto que 1024 px: el aviso con «Volver» y sin el código del editor', async ({
  page,
}) => {
  const scripts: string[] = []
  page.on('response', (respuesta) => {
    if (respuesta.request().resourceType() === 'script') {
      scripts.push(respuesta.url())
    }
  })
  await entrar(page, duena)
  await page.goto(`/artes/${plantilla}`)
  await expect(page.getByText('El editor de artes se usa en una computadora.')).toBeVisible()
  const volver = page.getByRole('link', { name: 'Volver', exact: true })
  await expect(volver).toHaveAttribute('href', '/artes')
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0)
  await page.waitForLoadState('networkidle')
  // Ningún script que se pidió trae Konva (su aviso de consola es propio).
  const conKonva: string[] = []
  for (const url of scripts) {
    const cuerpo = await (await page.request.get(url)).text()
    if (cuerpo.includes('Konva warning')) conKonva.push(url)
  }
  expect(conKonva).toEqual([])
  await volver.click()
  await expect(page).toHaveURL(/\/artes$/)
})
