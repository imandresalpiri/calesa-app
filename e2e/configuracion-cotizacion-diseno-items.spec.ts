// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio (e2e.md, 2026-11-08).
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
import {
  definicionYParamsComoLaPublicada,
  leerElBorradorDelDiseno,
  publicarFormulaConModos,
} from './soporte/diseno-editor'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// La pestaña «Hoja», ítems, cabecera y tarjeta (4.22-3, `docs/UX.md` › «Cotización: hoja (estados propios)»): el camino feliz en escritorio, eligiendo cada pieza en
// el lienzo y editándola en el inspector. Se enciende «Ver total en moneda local», se suma el modo «Paralelo» y se le cambian sus tipos de cambio, el interruptor
// pasa de «Habilita» a «Muestra», una celda gana un bloque de texto en su ayuda y la tarjeta muestra la garantía junto al total. Nada avisa «Revisa el diseño»; «Guardar
// el borrador» lo escribe con la definición y los `params` de la publicada tal cual, y recargar lo vuelve a mostrar.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-items-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Items' })
  origen = await crearOrigenDeCotizar(proyecto, 'ditems', false)
  publicarFormulaConModos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Cada pieza se elige en el lienzo (`data-elegir`, el valor de `?pieza=`) y se edita en el inspector.
const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
async function elegir(page: Page, pieza: string) {
  await page.locator(`[data-elegir="${pieza}"]`).click()
  await expect(inspector(page)).toHaveAttribute('data-pieza', pieza)
}
const cabecera = (page: Page) => inspector(page).locator('[data-cabecera-del-diseno]')
const tarjeta = (page: Page) => inspector(page).locator('[data-tarjeta-del-diseno]')
const modo = (page: Page, clave: string) => cabecera(page).locator(`li[data-modo="${clave}"]`)
const queHace = (page: Page) => inspector(page).getByLabel('Qué hace')
const ayuda = (page: Page) =>
  inspector(page).locator('[data-bloque-de-la-ayuda="texto"]').getByLabel('Texto', { exact: true })
// «+ Bloque» de la ayuda de la celda elegida: el menú con Título, Texto, Enlaces y Tabla.
async function sumarBloque(page: Page, tipo: 'Texto' | 'Enlaces') {
  await inspector(page).getByRole('button', { name: 'Bloque', exact: true }).click()
  await page.getByRole('menuitem', { name: tipo, exact: true }).click()
}
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')
const verTotal = (page: Page) =>
  cabecera(page).getByRole('switch', { name: 'Ofrecer «Ver total en moneda local»' })
const garantia = (page: Page) =>
  tarjeta(page).getByRole('checkbox', { name: 'Mostrar «Garantía» junto al total' })

async function abrirElDiseno(page: Page) {
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  await expect(page.locator('[data-elegir="cabecera-de-la-hoja"]')).toBeVisible()
}

// Lo que el recorrido deja: cada pieza, elegida, muestra lo suyo.
async function vuelveLoGuardado(page: Page) {
  await elegir(page, 'cabecera-de-la-hoja')
  await expect(verTotal(page)).toBeChecked()
  await expect(modo(page, 'paralelo').getByLabel('Tipo de cambio de origen')).toHaveValue('tc_b')
  await expect(modo(page, 'paralelo').getByLabel('Total en')).toHaveValue('tc_a')
  await elegir(page, 'extra')
  await expect(queHace(page)).toHaveValue('muestra')
  await elegir(page, 'precio')
  await expect(ayuda(page)).toHaveValue('El precio de la subasta')
  await elegir(page, 'tarjeta-del-total')
  await expect(garantia(page)).toBeChecked()
}

test('D2: cabecera, modos, interruptor, ayuda y tarjeta se editan y se guardan; lo guardado vuelve', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiseno(page)
  await expect(guardar(page)).toBeDisabled()

  await elegir(page, 'cabecera-de-la-hoja')
  await expect(verTotal(page)).not.toBeChecked()
  await verTotal(page).click()
  await cabecera(page).getByLabel('Nombre del modo').fill('Paralelo')
  await cabecera(page).getByRole('button', { name: 'Sumar un modo', exact: true }).click()
  await expect(modo(page, 'paralelo')).toBeVisible()
  await modo(page, 'paralelo').getByLabel('Tipo de cambio de origen').selectOption('tc_b')
  await modo(page, 'paralelo').getByLabel('Total en').selectOption('tc_a')

  await elegir(page, 'extra')
  await expect(queHace(page)).toHaveValue('habilita')
  await queHace(page).selectOption('muestra')
  await elegir(page, 'precio')
  await sumarBloque(page, 'Texto')
  await ayuda(page).fill('El precio de la subasta')
  await elegir(page, 'tarjeta-del-total')
  await expect(garantia(page)).not.toBeChecked()
  await garantia(page).click()

  await expect(page.locator('[data-avisos-del-diseno]')).not.toContainText('Revisa el diseño')
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')

  const borrador = leerElBorradorDelDiseno(origen.id)
  expect(borrador).not.toBeNull()
  const { diseno } = borrador!
  expect(diseno.cabecera?.ver_total_bs).toBe(true)
  expect(diseno.cabecera?.modos).toStrictEqual([
    {
      clave: 'paralelo',
      nombre: 'Paralelo',
      buckets: [{ bucket: 'origen', nodo: 'tc_b' }],
      total_en: 'tc_a',
    },
  ])
  const items = diseno.secciones.find((s) => s.id === 'datos')?.items
  expect(items?.find((i) => i.tipo === 'interruptor')).toMatchObject({ efecto: 'muestra' })
  expect(items?.find((i) => i.nodo === 'precio')).toMatchObject({
    ayuda: [{ tipo: 'texto', texto: 'El precio de la subasta' }],
  })
  expect(diseno.tarjeta_total).toStrictEqual({ nodo: 'total', secundarios: ['garantia'] })
  expect(definicionYParamsComoLaPublicada(origen.id)).toBe(true)

  await abrirElDiseno(page)
  await vuelveLoGuardado(page)
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})

test('D3: lo de por defecto de la cabecera y un bloque de enlaces de la ayuda se editan con su validación y se guardan en el borrador', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiseno(page)
  await elegir(page, 'cabecera-de-la-hoja')
  await cabecera(page).getByLabel('Nombre del modo').fill('Unificado')
  await cabecera(page).getByRole('button', { name: 'Sumar un modo', exact: true }).click()
  await expect(modo(page, 'unificado')).toBeVisible()
  const porDefecto = page.locator('[data-por-defecto-del-diseno]')
  await porDefecto
    .getByRole('group', { name: 'Tipo de cambio por defecto' })
    .getByRole('radio', { name: 'Unificado' })
    .check()
  const visibles = porDefecto.getByRole('group', { name: 'Opciones visibles en el encabezado' })
  await expect(visibles.getByRole('checkbox', { name: 'Unificado' })).toBeDisabled()
  await visibles.getByRole('checkbox', { name: 'Paralelo' }).click()
  await porDefecto
    .getByRole('checkbox', { name: 'Mostrar el total en moneda local por defecto' })
    .click()

  await elegir(page, 'precio')
  const precio = inspector(page)
  await sumarBloque(page, 'Enlaces')
  await precio.getByLabel('Título del enlace 1').fill('Copart')
  await precio.getByLabel('Dirección del enlace 1').fill('http://www.copart.com/')
  await expect(precio.getByText('Tiene que empezar con https://.')).toBeVisible()
  await precio.getByLabel('Dirección del enlace 1').fill('https://www.copart.com/')
  await expect(precio.getByText('Tiene que empezar con https://.')).toHaveCount(0)

  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const diseno = leerElBorradorDelDiseno(origen.id)?.diseno
  expect(diseno?.cabecera).toMatchObject({
    modo_por_defecto: 'unificado',
    ver_total_bs_por_defecto: true,
    modos_visibles: ['unificado'],
  })
  const item = diseno?.secciones.flatMap((s) => s.items).find((i) => i.nodo === 'precio')
  expect(item).toMatchObject({
    ayuda: [
      { tipo: 'texto', texto: 'El precio de la subasta' },
      { tipo: 'enlaces', enlaces: [{ titulo: 'Copart', url: 'https://www.copart.com/' }] },
    ],
  })
})
