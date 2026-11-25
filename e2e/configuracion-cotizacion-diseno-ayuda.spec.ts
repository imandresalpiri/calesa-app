// @sin-celular-archivo: pantalla de Configuración; el editor de la hoja pide al menos 1.024 px y el camino feliz va sólo en escritorio (e2e.md).
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
import { leerElBorradorDelDiseno, publicarFormulaConModos } from './soporte/diseno-editor'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'
import { literal, sql } from './soporte/sql'

// La ayuda de una celda en el inspector de la hoja (`docs/UX.md` › «La ayuda»; glosario: «Bloque de la ayuda»): en «Precio», «+ Bloque» suma un texto y dos tablas.
// La primera nace con la primera tabla del origen sin usar y la segunda con la otra; en la del IVA, «IVA» llena «Garantía» y se resalta la fila del vehículo.
// «Abrir en Tablas» abre el drawer de tablas ahí mismo y, al cerrarlo, lo armado sigue. «Guardar el borrador» lo escribe así y recargar lo vuelve a mostrar.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

// Dos tablas vivas del origen; por clave, la del IVA primero.
function crearTablasDelOrigen(origenId: string): void {
  sql(`
    insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values
      (${literal(origenId)}::uuid, 'ayuda_a_iva', 'IVA por año', ${json([
        { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
        { clave: 'iva', etiqueta: 'IVA', tipo: 'numero' },
      ])}),
      (${literal(origenId)}::uuid, 'ayuda_b_fletes', 'Fletes por puerto', ${json([
        { clave: 'puerto', etiqueta: 'Puerto', tipo: 'texto' },
        { clave: 'costo', etiqueta: 'Costo', tipo: 'numero' },
      ])})`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ayuda-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Ayuda' })
  origen = await crearOrigenDeCotizar(proyecto, 'dayuda', false)
  publicarFormulaConModos(origen.id)
  crearTablasDelOrigen(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const inspector = (page: Page) => page.locator('aside[data-inspector-de-la-hoja]')
const bloque = (page: Page, tipo: string) =>
  inspector(page).locator(`li[data-bloque-de-la-ayuda="${tipo}"]`)
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')

async function abrirLaAyudaDelPrecio(page: Page) {
  await abrirLaFormula(page, origen.id, 'hoja')
  await enLaPestana(page, 'Hoja')
  await page.locator('[data-elegir="precio"]').click()
  await expect(inspector(page)).toHaveAttribute('data-pieza', 'precio')
}

async function sumarBloque(page: Page, tipo: 'Texto' | 'Tabla') {
  await inspector(page).getByRole('button', { name: 'Bloque', exact: true }).click()
  await page.getByRole('menuitem', { name: tipo, exact: true }).click()
}

test('un texto y dos tablas se arman en el inspector, «Abrir en Tablas» no pierde nada y el borrador guarda los bloques', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaAyudaDelPrecio(page)
  await expect(
    inspector(page).getByText('Sin ayuda: la celda no muestra el botón «?».'),
  ).toBeVisible()

  await sumarBloque(page, 'Texto')
  await bloque(page, 'texto')
    .getByLabel('Texto', { exact: true })
    .fill('El IVA sale de la tabla del año.')

  await sumarBloque(page, 'Tabla')
  const iva = bloque(page, 'tabla').nth(0)
  await expect(iva.getByLabel('Tabla', { exact: true })).toHaveValue('ayuda_a_iva')
  await iva.getByLabel('«IVA» llena la celda').selectOption({ label: 'Garantía' })
  await iva.getByRole('switch', { name: 'Resaltar la fila del vehículo' }).click()

  await sumarBloque(page, 'Tabla')
  const fletes = bloque(page, 'tabla').nth(1)
  await expect(fletes.getByLabel('Tabla', { exact: true })).toHaveValue('ayuda_b_fletes')
  await fletes.getByRole('checkbox', { name: 'Mostrar «Puerto»' }).click()

  // «Abrir en Tablas» abre el drawer de tablas en la pestaña, con esa tabla; al cerrarlo, lo armado sigue.
  await iva.getByRole('button', { name: 'Abrir en Tablas' }).click()
  const tablas = page.getByRole('dialog', { name: 'Tablas de referencia' })
  await expect(tablas).toContainText('IVA por año')
  await expect.poll(() => new URL(page.url()).searchParams.get('pieza')).toBe('precio')
  await page.keyboard.press('Escape')
  await expect(tablas).toBeHidden()
  await expect(iva.getByLabel('«IVA» llena la celda')).toHaveValue('garantia')

  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const precio = leerElBorradorDelDiseno(origen.id)
    ?.diseno.secciones.flatMap((s) => s.items)
    .find((i) => i.nodo === 'precio')
  expect(precio?.ayuda).toStrictEqual([
    { tipo: 'texto', texto: 'El IVA sale de la tabla del año.' },
    {
      tipo: 'tabla',
      tabla: 'ayuda_a_iva',
      columnas: [{ columna: 'anio' }, { columna: 'iva', llena: 'garantia' }],
      resaltar: true,
    },
    { tipo: 'tabla', tabla: 'ayuda_b_fletes', columnas: [{ columna: 'costo' }] },
  ])

  await abrirLaAyudaDelPrecio(page)
  await expect(bloque(page, 'tabla')).toHaveCount(2)
  await expect(iva.getByLabel('«IVA» llena la celda')).toHaveValue('garantia')
  await expect(iva.getByRole('switch', { name: 'Resaltar la fila del vehículo' })).toBeChecked()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})
