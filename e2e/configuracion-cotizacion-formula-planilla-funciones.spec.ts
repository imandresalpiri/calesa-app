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
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarFormulaConTexto } from './soporte/formula-editor'
import { literal, sql } from './soporte/sql'
import {
  a1De,
  abrirPlanilla,
  celdaDe,
  filaDe,
  guardado,
  guardar,
  planilla,
  sembrarFletes,
  textoDeLaBarra,
} from './soporte/planilla'

// Las funciones de Excel de la fórmula (`docs/COTIZADOR.md` › «Fórmulas como texto»): la fila `comision` se reescribe en la barra de fórmula de la planilla con
// SI, una comparación, MAX y BUSCARV por tramo sobre una tabla de referencia del origen, escritos en A1 (`pub` es una celda: C7), se publica y la hoja de cotizar
// la calcula en la base a cada lado del umbral. La fórmula es la de prueba con texto (`formula-editor.ts`): `pub` («Pública») es un input en dólares y `comision` tiene su celda en el diseño (el total
// de la tarjeta es la suma de los grupos, que no la incluye); `fletes` es una tabla viva del origen con desde, hasta y monto. Un BUSCARV sobre una tabla que el
// origen no tiene no se aplica y dice por qué.

let duena = ''
let origen = { id: '', nombre: '' }

// En A1, con la celda de `pub`.
const texto = (pub: string) =>
  `=SI(${pub}>1000; MAX(${pub}*0.1; 150); BUSCARV(${pub}; "fletes"; "monto"; VERDADERO))`
test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-funciones-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fina Funciones' })
  origen = await crearOrigenDeCotizar(proyecto, 'funciones', false)
  publicarFormulaConTexto(origen.id)
  sembrarFletes(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })
const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')
const celdaDeLaHoja = (page: Page, nodo: string) => page.locator(`[data-nodo="${nodo}"]`)

// Tipea un número en una celda de la hoja como una persona: la celda sólo abre cuando la página terminó de hidratar, así que se insiste hasta que abre.
async function tipear(page: Page, nodo: string, texto: string): Promise<void> {
  const entrada = celdaDeLaHoja(page, nodo).locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) {
      await celdaDeLaHoja(page, nodo).locator('[data-parada="0"]').click()
    }
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

async function comisionEs(page: Page, valor: number): Promise<void> {
  await expect
    .poll(async () => sinEspacios(await celdaDeLaHoja(page, 'comision').textContent()))
    .toContain(sinEspacios(usd(valor)))
}

test('la comisión con SI, MAX y BUSCARV se escribe en la planilla, se publica y la hoja la calcula a cada lado del umbral', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')

  // (1) Una tabla que el origen no tiene: el error bajo la barra y lo escrito queda.
  await celdaDe(page, 'comision').click()
  const barra = textoDeLaBarra(page)
  await barra.fill(`=BUSCARV(${pub}; "no_existe"; "monto")`)
  await barra.press('Enter')
  await expect(planilla(page).getByRole('alert')).toContainText(
    'La tabla «no_existe» no existe en este origen.',
  )
  await expect(barra).toHaveValue(`=BUSCARV(${pub}; "no_existe"; "monto")`)

  // (2) La fórmula del ejemplo se aplica y «De dónde sale» la dice con las etiquetas y la tabla.
  await barra.fill(texto(pub))
  await barra.press('Enter')
  await expect(planilla(page).getByRole('alert')).toHaveCount(0)
  await celdaDe(page, 'comision').click()
  await expect(barra).toHaveValue(texto(pub))
  await expect(filaDe(page, 'comision')).toContainText(
    '(el mayor de (Pública × 0,1) y 150) si Pública > 1.000, si no de la tabla fletes por Pública',
  )

  // (3) Guardar el borrador y publicarlo: la comisión publicada es un `elegir` y la búsqueda, un `tramo` sobre `fletes`. Sus auxiliares no piden celda.
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  await barraDeLaFormula(page).getByRole('button', { name: 'Publicar…', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Con funciones de Excel')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = (consulta: string) =>
    sql(
      `select ${consulta} from public.formulas f where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    )
  await expect.poll(() => publicada('version')).toBe('2')
  const nodo = (filtro: string, campo: string) =>
    publicada(
      `(select n ->> '${campo}' from jsonb_array_elements(f.definicion -> 'nodos') n where ${filtro})`,
    )
  expect(nodo(`n ->> 'id' = 'comision'`, 'op')).toBe('elegir')
  expect(nodo(`n ->> 'tabla' = 'fletes'`, 'tipo')).toBe('tramo')

  // (4) La hoja calcula en la base: sobre el umbral manda el MAX (el 10 % o el piso de 150); debajo, el tramo de la tabla.
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await tipear(page, 'pub', '2000')
  await comisionEs(page, 200)
  await tipear(page, 'pub', '1200')
  await comisionEs(page, 150)
  await tipear(page, 'pub', '800')
  await comisionEs(page, 300)
})
