// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { barraDeLaFormula } from './soporte/barra-de-la-formula'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { MARCA, borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarFormulaConTexto } from './soporte/formula-editor'
import { leerBorrador } from './soporte/formula-editor-guardar'
import {
  abrirPlanilla,
  arrastrarFila,
  filaDe,
  grilla,
  guardado,
  guardar,
  menuDeLaFila,
  planilla,
} from './soporte/planilla'
import { sql } from './soporte/sql'

// Las bandas de la planilla (`docs/UX.md` › «Cotización: fórmula (estados propios)»): el panel de una banda (etiqueta, plazo y color), pasar una fila a otra banda
// arrastrando su número (cambia el total en Bs), el doble conteo marcado al soltar, «Total y tipos de cambio», crear una banda con «Sumar una fila» y quitarla con
// «Deshacer»; guardar el borrador lo escribe. La fórmula de prueba (`formula-editor.ts`) tiene `gpub` (bucket `origen` → `tc`, `oficial`) y `gx` (bucket `alt` →
// `tc_x`, `paralelo`); `con_ayuda` es una constante de 5 en `gpub`, `x_sub` suma `x_celda` (de `gx`) y lo demás vale 0.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-bandas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Berta Bandas' })
  origen = await crearOrigenDeCotizar(proyecto, 'plbandas', false)
  publicarFormulaConTexto(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const totales = (page: Page) => planilla(page).getByRole('region', { name: 'Totales' })
const cabecera = (page: Page, grupo: string) => grilla(page).locator(`tr[data-banda="${grupo}"]`)
const enLaBanda = (page: Page, grupo: string, fila: string) =>
  grilla(page).locator(`tbody[data-grupo="${grupo}"] tr[data-fila="${fila}"]`)
const tipoDeCambio = (clave: string) =>
  Number(sql(`select valor from public.tipos_cambio where clave = '${clave}' and activo`))
const enBs = (valor: number) => formatearMonto(valor, { moneda: 'BOB', locale: 'es-BO' })

async function elegir(page: Page, renglon: string) {
  await page.getByRole('menuitem', { name: new RegExp(`^${renglon}`) }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
}

async function delMenuDeLaPlanilla(page: Page, renglon: string) {
  await barraDeLaFormula(page).getByRole('button', { name: 'Más acciones de la planilla' }).click()
  await elegir(page, renglon)
}

// (1) El panel de «Pública»: etiqueta, plazo y color; la cabecera los dice y su tramo lleva el color.
async function editarPublica(page: Page, otroTono: string) {
  await cabecera(page, 'gpub')
    .first()
    .getByRole('button', { name: 'Acciones de la banda «Pública»' })
    .click()
  await elegir(page, 'Renombrar, color, plazo y tipo de cambio')
  const panel = page.getByRole('dialog', { name: 'Banda «Pública»' })
  await panel.getByLabel('Etiqueta', { exact: true }).fill('Pública local')
  await panel.getByLabel('Plazo de pago', { exact: true }).fill('3 días')
  await panel.getByLabel('Color', { exact: true }).selectOption(otroTono)
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(panel).toBeHidden()
  await expect(cabecera(page, 'gpub').first()).toContainText('Pública local')
  await expect(cabecera(page, 'gpub').first()).toContainText('Plazo: 3 días')
  await expect(grilla(page).locator('tbody[data-grupo="gpub"]').first()).toHaveAttribute(
    'data-tono',
    otroTono,
  )
}

// (5) Crear «Fletes» desde el «⋯» de la planilla con «Dependiente» y quitarla: su fila queda sin banda, con «Deshacer».
async function crearYQuitarFletes(page: Page) {
  await delMenuDeLaPlanilla(page, 'Nueva banda')
  const nueva = page.getByRole('dialog', { name: 'Nueva banda' })
  await nueva.getByLabel('Etiqueta', { exact: true }).fill('Fletes')
  await nueva.getByLabel('Tipo de cambio', { exact: true }).selectOption('tc')
  await nueva.getByLabel('Sumar una fila', { exact: true }).selectOption('dep')
  await nueva.getByRole('button', { name: 'Sumar', exact: true }).click()
  await nueva.getByRole('button', { name: 'Crear banda', exact: true }).click()
  await expect(nueva).toBeHidden()
  const fletes = grilla(page).locator('tr[data-banda]').filter({ hasText: 'Fletes' })
  await expect(fletes).toHaveCount(1)
  const id = (await fletes.getAttribute('data-banda')) ?? ''
  await expect(enLaBanda(page, id, 'dep')).toHaveCount(1)

  await fletes.getByRole('button', { name: 'Acciones de la banda «Fletes»' }).click()
  await elegir(page, 'Quitar banda')
  await expect(fletes).toHaveCount(0)
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Se quitó la banda «Fletes».' }),
  ).toBeVisible()
  await expect(filaDe(page, 'dep').locator('xpath=ancestor::tbody[1]')).not.toHaveAttribute(
    'data-grupo',
    /.+/,
  )
}

test('el panel de una banda, pasar una fila arrastrando, el doble conteo, «Total y tipos de cambio», crear y quitar; guardar lo escribe', async ({
  page,
}) => {
  const [otroTono] = sql(
    `select clave from public.tonos where clave <> 'verde' order by nombre limit 1`,
  ).split('|')
  if (!otroTono) throw new Error('el catálogo de colores está vacío')
  const oficial = tipoDeCambio('oficial')
  const paralelo = tipoDeCambio('paralelo')

  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  await expect(totales(page)).toContainText(enBs(5 * oficial))

  await editarPublica(page, otroTono)

  // (2) «Con ayuda», arrastrada debajo de la fila de `gx`, entra a esa banda: el total en Bs pasa a 5 × el tipo de cambio `paralelo`.
  await arrastrarFila(page, 'con_ayuda', 'x_celda', 'despues')
  await expect(enLaBanda(page, 'gx', 'con_ayuda')).toHaveCount(1)
  await expect(totales(page)).toContainText(enBs(5 * paralelo))

  // (3) `x_sub` suma `x_celda`: soltada en `gx` se contaría dos veces. Queda marcada y «Sin banda» lo arregla.
  await arrastrarFila(page, 'x_sub', 'con_ayuda', 'despues')
  await expect(enLaBanda(page, 'gx', 'x_sub')).toHaveCount(1)
  await expect(planilla(page)).toContainText(/se contaría dos veces/)
  await menuDeLaFila(page, 'x_sub')
  await page.getByRole('menuitem', { name: 'Banda', exact: true }).click()
  await elegir(page, 'Sin banda')
  await expect(planilla(page)).not.toContainText(/se contaría dos veces/)

  // (4) «Total y tipos de cambio»: el bucket de `gx` pasa al tipo de cambio `oficial`. El diseño tiene un modo, que elige el de cada banda: la cabecera y los
  // totales siguen al modo y la fórmula guarda el bucket (lo mira el paso 6).
  await delMenuDeLaPlanilla(page, 'Total y tipos de cambio')
  const total = page.getByRole('dialog', { name: 'Total y tipos de cambio' })
  await total.getByLabel('Tipo de cambio de «alt»', { exact: true }).selectOption('tc')
  await total.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(total).toBeHidden()
  await expect(cabecera(page, 'gx')).toContainText(`Tipo de cambio: TCX-${MARCA}`)
  await expect(totales(page)).toContainText(enBs(5 * paralelo))

  await crearYQuitarFletes(page)

  // (6) Guardar el borrador escribe todo.
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const definicion = leerBorrador(origen.id)?.definicion as unknown as {
    nodos: { id: string; grupo?: string }[]
    grupos: { id: string; etiqueta: string; plazo?: string; tono: string }[]
    buckets: Record<string, string>
  }
  expect(definicion.grupos.find((g) => g.id === 'gpub')).toMatchObject({
    etiqueta: 'Pública local',
    plazo: '3 días',
    tono: otroTono,
  })
  expect(definicion.grupos.map((g) => g.etiqueta)).not.toContain('Fletes')
  expect(definicion.grupos.find((g) => g.id === 'gx')?.etiqueta).toBe(`GRUPOX-${MARCA}`)
  const grupoDe = (id: string) => definicion.nodos.find((n) => n.id === id)?.grupo
  expect(grupoDe('con_ayuda')).toBe('gx')
  expect(grupoDe('x_sub')).toBeUndefined()
  expect(grupoDe('dep')).toBeUndefined()
  expect(definicion.buckets['alt']).toBe('tc')
})
