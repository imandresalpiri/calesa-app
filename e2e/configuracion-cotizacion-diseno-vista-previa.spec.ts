import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElBorradorDelDiseno, publicarFormulaDeTresSumandos } from './soporte/diseno-editor'
import { sinScrollHorizontal } from './soporte/recorrido'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// Las vistas del editor de la hoja (`docs/UX.md` › «Cotización: hoja (estados propios)»): el lienzo es la hoja dibujada con los componentes de cotizar a 412, 1.280
// y 1.920 px y a 412 con el texto al doble, achicada para entrar. En escritorio la elección va en la URL, sobrevive a recargar y en cada vista se elige una pieza y
// se edita, sin guardar y sin tocar la base; lo que dibuja la hoja no recibe el foco. Por debajo de 1.024 px (el celular), la hoja en sólo lectura con su aviso.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-vista-previa-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Vista' })
  origen = await crearOrigenDeCotizar(proyecto, 'dvista', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lienzo = (page: Page) => page.locator('[data-lienzo-de-la-hoja]')
const vistas = (page: Page) => page.getByRole('group', { name: 'Vista de la hoja' })
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const tituloDeLaBase = (page: Page) => lienzo(page).locator('section[data-seccion="base"] h2')

async function elegirLaVista(page: Page, nombre: string, vista: string) {
  await vistas(page).getByRole('button', { name: nombre, exact: true }).click()
  await expect(vistas(page).getByRole('button', { name: nombre, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page).toHaveURL(new RegExp(`vista=${vista}(&|$)`))
  await expect(lienzo(page)).toHaveAttribute('data-vista', vista)
}

const VISTAS = [
  { nombre: 'Celular', vista: '412' },
  { nombre: 'Grande', vista: '1920' },
  { nombre: 'Texto al 200 %', vista: '200' },
  { nombre: 'Laptop', vista: '1280' },
] as const

// @sin-celular: el editor de la hoja se usa desde 1.024 px; en el celular se ve en sólo lectura y eso lo prueba V2.
test('V1: las cuatro vistas dibujan la hoja a su ancho, van en la URL y en cada una se edita sin guardar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  // Sin `?vista=`, la de la ventana: 1.280 px es la laptop.
  await expect(lienzo(page)).toHaveAttribute('data-vista', '1280')
  await expect(vistas(page).getByRole('button', { name: 'Laptop', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await elegirLaVista(page, 'Texto al 200 %', '200')
  await page.reload()
  await expect(lienzo(page)).toHaveAttribute('data-vista', '200')

  for (const { nombre, vista } of VISTAS) {
    await elegirLaVista(page, nombre, vista)
    await lienzo(page)
      .locator('[data-elegir="seccion-base"]')
      .click({ position: { x: 24, y: 6 } })
    await expect(inspector(page)).toHaveAttribute('data-pieza', 'seccion-base')
    const titulo = inspector(page).getByLabel('Título')
    await titulo.fill(`Base ${nombre}`)
    await titulo.press('Tab')
    await expect(tituloDeLaBase(page)).toHaveText(`Base ${nombre}`)
  }
  expect(leerElBorradorDelDiseno(origen.id)).toBeNull()

  // Lo que dibuja la hoja va `inert`: ninguna celda recibe el foco.
  const enfocado = await lienzo(page).evaluate((raiz) => {
    const campo = raiz.querySelector<HTMLElement>('[inert] input, [inert] button')
    campo?.focus()
    return (
      campo !== null && raiz.contains(document.activeElement) && campo === document.activeElement
    )
  })
  expect(enfocado).toBe(false)
})

test('V2: por debajo de 1.024 px la hoja se ve a 412 en sólo lectura, con el aviso, sin el inspector', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 900 })
  await entrar(page, duena, { fresco: true })
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  const soloLectura = page.locator('[data-hoja-solo-lectura]')
  await expect(
    soloLectura
      .getByRole('status')
      .filter({ hasText: 'Este editor se usa en una pantalla de al menos 1.024 px.' }),
  ).toBeVisible()
  await expect(soloLectura.locator('[data-lienzo-de-la-hoja]')).toHaveAttribute('data-vista', '412')
  await expect(soloLectura.locator('[data-seccion="base"]')).toBeVisible()
  await expect(page.locator('[data-editor-de-la-hoja]')).toHaveCount(0)
  await expect(page.locator('[data-elegir]')).toHaveCount(0)
  await sinScrollHorizontal(page)
})
