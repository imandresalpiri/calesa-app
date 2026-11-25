// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
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
import {
  a1De,
  abrirPlanilla,
  celdaDe,
  entradaDeLaCelda,
  filaDe,
  grilla,
  guardado,
  guardar,
  menuDeLaFila,
  planilla,
  sembrarFletes,
  sugerencias,
  textoDeLaBarra,
} from './soporte/planilla'
import { literal, sql } from './soporte/sql'

// La fórmula como hoja de cálculo, de punta a punta (`docs/COTIZADOR.md` › «El editor»): referencias A1 con el clic, la fila insertada que corre las referencias,
// el tipo de celda, una banda nueva, las funciones con sugerencias (SI, MAX con un rango, BUSCARV con su tabla y columna), la referencia hacia abajo con «Mover
// esta fila debajo de la N», guardar y publicar (lo guardado nombra ids) y las URL viejas del Modo avanzado y de las plantillas. La fórmula es la de prueba con texto
// (`formula-editor.ts`): `pub` («Pública») lo escribe el asesor, `con_ayuda` es un valor fijo de 5 y `comision` un cálculo; `fletes` es una tabla viva del origen.

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-excel-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Elsa Excel' })
  origen = await crearOrigenDeCotizar(proyecto, 'excel', false)
  publicarFormulaConTexto(origen.id)
  sembrarFletes(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const numeroDe = (a1: string) => Number(a1.slice(1))
// La misma columna, una fila más abajo: «C7» → «C8».
const siguiente = (a1: string) => `${a1.slice(0, 1)}${String(numeroDe(a1) + 1)}`
const cabeceraDeSeguros = (page: Page) =>
  grilla(page).locator('tr[data-banda]').filter({ hasText: 'Seguros' })

// Elige la C de la fila y empieza a escribir encima con «=», como en una hoja de cálculo.
async function empezarConIgual(page: Page, id: string) {
  await celdaDe(page, id).click()
  await page.keyboard.press('=')
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await expect(entradaDeLaCelda(page)).toHaveValue('=')
}

async function elegirEnElMenu(page: Page, id: string, ...camino: string[]) {
  await menuDeLaFila(page, id)
  for (const renglon of camino) {
    await page.getByRole('menuitem', { name: new RegExp(`^${renglon}`) }).click()
  }
  await expect(page.getByRole('menu')).toHaveCount(0)
}

async function tipoElegido(page: Page, id: string, tipo: string) {
  await menuDeLaFila(page, id)
  await page.getByRole('menuitem', { name: 'Tipo de celda', exact: true }).click()
  await expect(
    page.getByRole('menuitem', { name: new RegExp(`^${tipo}`) }).getByLabel('Elegido'),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

// (1) «=», clic en la C de Pública, «+» y clic en la de Con ayuda: bordes de color y la leyenda; Enter aplica.
async function referenciarConElClic(page: Page, pub: string, conAyuda: string) {
  await empezarConIgual(page, 'comision')
  await celdaDe(page, 'pub').click()
  await expect(entradaDeLaCelda(page)).toHaveValue(`=${pub}`)
  await entradaDeLaCelda(page).press('+')
  await celdaDe(page, 'con_ayuda').click()
  await expect(entradaDeLaCelda(page)).toHaveValue(`=${pub}+${conAyuda}`)
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await expect(celdaDe(page, 'pub')).toHaveAttribute('style', /--viz-series-1/)
  await expect(celdaDe(page, 'con_ayuda')).toHaveAttribute('style', /--viz-series-2/)
  const leyenda = planilla(page).locator('[data-leyenda-de-referencias]')
  await expect(leyenda).toContainText(`${pub} Pública`)
  await expect(leyenda).toContainText(`${conAyuda} Con ayuda`)
  await entradaDeLaCelda(page).press('Enter')
  await expect(entradaDeLaCelda(page)).toBeHidden()
}

// (2) Insertar una fila arriba de Pública desde el clic derecho: las referencias de Comisión corren una fila. Devuelve el id de la fila nueva.
async function insertarArribaDePublica(page: Page, pub: string, conAyuda: string) {
  await celdaDe(page, 'pub', 'A').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Insertar arriba', exact: true }).click()
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await entradaDeLaCelda(page).pressSequentially('Seguro')
  await entradaDeLaCelda(page).press('Enter')
  await expect(entradaDeLaCelda(page)).toBeHidden()
  const seguro = grilla(page).locator('tr[data-fila]').filter({ hasText: 'Seguro' })
  await expect(seguro).toHaveCount(1)
  const id = (await seguro.getAttribute('data-fila')) ?? ''
  expect(await a1De(page, id)).toBe(pub)
  expect(await a1De(page, 'pub')).toBe(siguiente(pub))
  await celdaDe(page, 'comision').click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${siguiente(pub)}+${siguiente(conAyuda)}`)
  return id
}

// (3) El tipo de celda: «Lo escribe el asesor» y de vuelta «Valor fijo», con la etiqueta de siempre. (4) Una banda nueva con esa fila: su cabecera en la grilla.
async function tipoYBanda(page: Page, id: string) {
  await elegirEnElMenu(page, id, 'Tipo de celda', 'Lo escribe el asesor')
  await tipoElegido(page, id, 'Lo escribe el asesor')
  await elegirEnElMenu(page, id, 'Tipo de celda', 'Valor fijo')
  await tipoElegido(page, id, 'Valor fijo')
  await expect(celdaDe(page, id, 'A')).toHaveText('Seguro')

  await elegirEnElMenu(page, id, 'Banda', 'Nueva banda…')
  const panel = page.getByRole('dialog', { name: 'Nueva banda' })
  await panel.getByLabel('Etiqueta', { exact: true }).fill('Seguros')
  await panel.getByLabel('Tipo de cambio', { exact: true }).selectOption({ index: 1 })
  await panel.getByRole('button', { name: 'Crear banda', exact: true }).click()
  await expect(panel).toBeHidden()
  await expect(cabeceraDeSeguros(page)).toBeVisible()
}

// (5) SI con la sugerencia, MAX con un rango y BUSCARV con la tabla y la columna sugeridas.
async function funcionesConSugerencias(page: Page, pub: string, conAyuda: string) {
  const entrada = entradaDeLaCelda(page)
  const primera = sugerencias(page).getByRole('option').first()
  await empezarConIgual(page, 'comision')
  await entrada.pressSequentially('SI')
  await expect(primera).toContainText('SI')
  await entrada.press('Tab')
  await expect(entrada).toHaveValue('=SI(')
  await entrada.pressSequentially(`${pub}>1000; MAX(${pub}:${conAyuda}); BUSCARV(${pub}; "f`)
  await expect(primera).toContainText('fletes')
  await entrada.press('Tab')
  await entrada.pressSequentially('; "m')
  await expect(primera).toContainText('monto')
  await entrada.press('Tab')
  await entrada.pressSequentially('; VERDADERO))')
  const escrito = `=SI(${pub}>1000; MAX(${pub}:${conAyuda}); BUSCARV(${pub}; "fletes"; "monto"; VERDADERO))`
  await expect(entrada).toHaveValue(escrito)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
  await celdaDe(page, 'comision').click()
  await expect(textoDeLaBarra(page)).toHaveValue(escrito)
}

// (6) Una referencia hacia abajo: el motivo y «Mover esta fila debajo de la N», que la mueve y aplica.
async function referenciaHaciaAbajo(page: Page, id: string) {
  const comision = await a1De(page, 'comision')
  const entrada = entradaDeLaCelda(page)
  await empezarConIgual(page, id)
  await entrada.pressSequentially(`${comision}*2%`)
  await entrada.press('Enter')
  const mover = planilla(page).getByRole('button', {
    name: `Mover esta fila debajo de la ${String(numeroDe(comision))}`,
    exact: true,
  })
  await expect(mover).toBeVisible()
  await mover.click()
  await expect(mover).toBeHidden()
  await expect(entrada).toBeHidden()
  expect(numeroDe(await a1De(page, id))).toBe(numeroDe(comision))
  expect(numeroDe(await a1De(page, 'comision'))).toBe(numeroDe(comision) - 1)
}

// (7) La fila nueva no tiene celda en el diseño: se quita su banda, se elimina (con «Deshacer») y se guarda y publica. Lo guardado nombra ids, nunca celdas.
async function quitarGuardarYPublicar(page: Page, id: string) {
  await cabeceraDeSeguros(page)
    .getByRole('button', { name: 'Acciones de la banda «Seguros»' })
    .click()
  await page.getByRole('menuitem', { name: /^Quitar banda/ }).click()
  await expect(cabeceraDeSeguros(page)).toHaveCount(0)
  await elegirEnElMenu(page, id, 'Eliminar')
  await expect(page.getByText('Se eliminó «Seguro».')).toBeVisible()
  await expect(filaDe(page, id)).toHaveCount(0)
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  await barraDeLaFormula(page).getByRole('button', { name: 'Publicar…', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Como excel')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = (consulta: string) =>
    sql(
      `select ${consulta} from public.formulas f where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    )
  await expect.poll(() => publicada('version')).toBe('2')
  const guardadoComo = publicada(
    `(select n ->> 'texto' from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'id' = 'comision')`,
  )
  expect(guardadoComo).toContain('pub')
  expect(guardadoComo).toContain('"fletes"')
  expect(guardadoComo).not.toMatch(/\b[A-D]\d+\b/)
}

test('la fórmula como excel: referencias con el clic, filas, tipos, bandas, funciones, mover y publicar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')
  await referenciarConElClic(page, pub, conAyuda)
  const seguro = await insertarArribaDePublica(page, pub, conAyuda)
  await tipoYBanda(page, seguro)
  await funcionesConSugerencias(page, siguiente(pub), siguiente(conAyuda))
  await referenciaHaciaAbajo(page, seguro)
  await quitarGuardarYPublicar(page, seguro)
})
