// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { FILA_CON_TEXTO, publicarFormulaConTexto } from './soporte/formula-editor'
import { leerBorrador } from './soporte/formula-editor-guardar'
import {
  a1De,
  abrirCostado,
  abrirPlanilla,
  barra,
  botonDeFunciones,
  botonDelCostado,
  celdaDe,
  clicParaReferenciar,
  costado,
  entradaDeLaCelda,
  escribirEnLaCelda,
  grilla,
  guardado,
  guardar,
  planilla,
  tarjetaDelCostado,
  textoDeLaBarra,
  totalesDelCostado,
} from './soporte/planilla'
import { publicarPlantillaDeLaMini } from './soporte/plantilla'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La barra de fórmula de la planilla sin ruido (`docs/UX.md` › «Cotización: fórmula (estados propios)»): C dice lo que guarda la fórmula (el texto en A1 de un
// cálculo, el valor fijo o de dónde sale) y Ejemplo, lo que da con la unidad de ejemplo; «=» y el clic en las celdas arman una suma; `fx` › SUMA con un rango por
// Shift+clic; lo que escribe el asesor se tipea en Ejemplo; «Totales» y «Tarjeta» se abren al costado desde la barra, de a uno, sin mover la celda activa; y
// «+ Nuevo color» en el panel de una banda crea el color y lo deja elegido. La fórmula de prueba con texto (`formula-editor.ts`): `pub` («Pública») lo escribe el
// asesor, `con_ayuda` es un valor fijo de 5, `comision` = `=pub*4%` y `x_celda` lo escribe el asesor (en 0, debajo de las dos).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origen = { id: '', nombre: '' }
let conColor = { id: '', nombre: '' }

// El color que crea la prueba: su nombre propio, para borrar sólo el suyo (el catálogo tiene tope y lo comparten los specs).
const nombreDelColor = () => `Barra e2e ${proyecto}`
const borrarElColor = () => {
  sql(`delete from public.tonos where nombre = ${literal(nombreDelColor())}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarElColor()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-barra-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Bárbara Barra' })
  origen = await crearOrigenDeCotizar(proyecto, 'plbarra', false)
  publicarFormulaConTexto(origen.id)
  publicarPlantillaDeLaMini(origen.id, {
    grupos: [{ grupo: 'gpub' }, { grupo: 'gx' }],
    total: { etiqueta: 'Total' },
    logo: false,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  })
  conColor = await crearOrigenDeCotizar(proyecto, 'plcolor', false)
  publicarFormulaConTexto(conColor.id)
})

test.afterAll(async () => {
  // Primero los orígenes (sus fórmulas nombran el color), después el color.
  borrarOrigenesDeCotizar()
  borrarElColor()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })
const lineaBajoLaBarra = (page: Page) => barra(page).locator('[data-linea-bajo-la-barra]')

test('«=» y el clic arman la suma, que se ve en Ejemplo; lo del asesor se tipea en Ejemplo y su C sigue diciendo de dónde sale', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')
  const comision = (col: 'C' | 'D') => celdaDe(page, FILA_CON_TEXTO.id, col)

  // C de un cálculo: su texto en A1, no la cifra. C de lo que escribe el asesor: de dónde sale.
  await expect(comision('C')).toHaveText(`=${pub}*4%`)
  await expect(celdaDe(page, 'pub')).toContainText('lo escribe el asesor')
  const deDondeSaleLaPublica = (await celdaDe(page, 'pub').textContent()) ?? ''

  // (1) «=», clic en la C de Pública, «+» y clic en la de Con ayuda; Enter aplica.
  await comision('C').click()
  await expect(lineaBajoLaBarra(page)).toContainText('De dónde sale:')
  await page.keyboard.press('=')
  const entrada = entradaDeLaCelda(page)
  await expect(entrada).toBeFocused()
  await expect(entrada).toHaveValue('=')
  await clicParaReferenciar(page, celdaDe(page, 'pub'))
  await expect(entrada).toHaveValue(`=${pub}`)
  await entrada.press('+')
  await clicParaReferenciar(page, celdaDe(page, 'con_ayuda'))
  await expect(entrada).toHaveValue(`=${pub}+${conAyuda}`)
  await capturar(page, info, 'referencias-con-el-clic')
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
  await expect(comision('C')).toHaveText(`=${pub}+${conAyuda}`)
  await expect(comision('D')).toContainText(usd(5))

  // (3) La unidad de ejemplo se tipea en Ejemplo de Pública: la suma cambia y su C sigue diciendo de dónde sale.
  await escribirEnLaCelda(page, celdaDe(page, 'pub', 'D'), '100')
  await expect(comision('D')).toContainText(usd(105))
  await expect(celdaDe(page, 'pub', 'D')).toContainText('100')
  await expect(celdaDe(page, 'pub')).toHaveText(deDondeSaleLaPublica)
  await capturar(page, info, 'ejemplo-de-la-publica')

  // Un número en la C de Pública no se escribe: el ejemplo va en Ejemplo.
  await celdaDe(page, 'pub').dblclick()
  await expect(entrada).toBeFocused()
  await entrada.fill('50')
  await entrada.press('Enter')
  await expect(planilla(page).getByRole('alert')).toContainText(
    'Esta celda la escribe el asesor al cotizar: el ejemplo va en la columna Ejemplo.',
  )
  await capturar(page, info, 'numero-en-la-c-del-asesor')
  await entrada.press('Escape')
  await expect(entrada).toBeHidden()
  await expect(celdaDe(page, 'pub', 'D')).toContainText('100')
})

test('fx › SUMA deja «=SUMA()» con el cursor adentro; el clic y el Shift+clic arman el rango y la suma se ve en Ejemplo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')
  const texto = textoDeLaBarra(page)

  // Al entrar no hay celda elegida: la barra muestra su guía y `fx` está apagado.
  await expect(barra(page)).toContainText('Escribe = y toca las celdas: =C5+C7')
  await expect(botonDeFunciones(page)).toHaveAttribute('aria-disabled', 'true')
  // `x_celda` lo escribe el asesor: su C abre vacía y `fx` la vuelve cálculo.
  await celdaDe(page, 'x_celda').click()
  await botonDeFunciones(page).click()
  await page.getByRole('menuitem', { name: /^SUMA\(/ }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(texto).toBeFocused()
  await expect(texto).toHaveValue('=SUMA()')
  await expect(texto).toHaveJSProperty('selectionStart', '=SUMA('.length)

  await clicParaReferenciar(page, celdaDe(page, 'pub'))
  await expect(texto).toHaveValue(`=SUMA(${pub})`)
  await clicParaReferenciar(page, celdaDe(page, 'con_ayuda'), true)
  await expect(texto).toHaveValue(`=SUMA(${pub}:${conAyuda})`)
  await capturar(page, info, 'suma-con-un-rango')
  await texto.press('Enter')
  await expect(celdaDe(page, 'x_celda')).toHaveText(`=SUMA(${pub}:${conAyuda})`)
  await expect(celdaDe(page, 'x_celda', 'D')).toContainText(usd(5))
})

test('«Totales» y «Tarjeta» cerrados al entrar; se abren de a uno desde la barra y cerrarlos deja la celda activa como estaba', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  await expect(page).not.toHaveURL(/costado=/)
  await expect(costado(page, 'Totales')).toBeHidden()
  await expect(costado(page, 'Tarjeta')).toBeHidden()
  for (const cual of ['Totales', 'Tarjeta'] as const) {
    await expect(botonDelCostado(page, cual)).toHaveAttribute('aria-expanded', 'false')
  }

  await celdaDe(page, FILA_CON_TEXTO.id).click()
  const activa = await grilla(page).getAttribute('aria-activedescendant')
  expect(activa).not.toBeNull()

  await abrirCostado(page, 'Totales')
  await expect(page).toHaveURL(/costado=totales/)
  await expect(totalesDelCostado(page)).toContainText(usd(5))
  await capturar(page, info, 'totales-al-costado')

  // Abrir «Tarjeta» cierra «Totales».
  await abrirCostado(page, 'Tarjeta')
  await expect(page).toHaveURL(/costado=tarjeta/)
  await expect(costado(page, 'Totales')).toBeHidden()
  await expect(botonDelCostado(page, 'Totales')).toHaveAttribute('aria-expanded', 'false')
  await expect(tarjetaDelCostado(page)).toContainText(usd(5))
  await capturar(page, info, 'tarjeta-al-costado')

  // Tocar el abierto lo cierra.
  await botonDelCostado(page, 'Tarjeta').click()
  await expect(costado(page, 'Tarjeta')).toBeHidden()
  await expect(page).not.toHaveURL(/costado=/)
  await expect(botonDelCostado(page, 'Tarjeta')).toHaveAttribute('aria-expanded', 'false')
  await expect(grilla(page)).toHaveAttribute('aria-activedescendant', activa ?? '')
})

test('«+ Nuevo color» en el panel de una banda crea el color, lo deja elegido, la banda lo aplica y el borrador lo guarda', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, conColor.id)
  await grilla(page)
    .locator('tr[data-banda="gpub"]')
    .first()
    .getByRole('button', { name: 'Acciones de la banda «Pública»' })
    .click()
  await page.getByRole('menuitem', { name: /^Renombrar, color, plazo y tipo de cambio/ }).click()
  const panel = page.getByRole('dialog', { name: 'Banda «Pública»' })
  const nuevo = panel.getByRole('button', { name: 'Nuevo color', exact: true })
  await expect(nuevo).toBeEnabled()
  await nuevo.click()
  await expect(page).toHaveURL(/color=nuevo/)

  const modal = page.getByRole('dialog', { name: 'Nuevo color' })
  await expect(modal).toBeVisible()
  await modal.getByLabel('Nombre', { exact: true }).fill(nombreDelColor())
  await modal.getByLabel('Color', { exact: true }).fill('#5b8def')
  await capturar(page, info, 'nuevo-color')
  await modal.getByRole('button', { name: 'Crear color', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/color=nuevo/)

  const clave = sql(`select clave from public.tonos where nombre = ${literal(nombreDelColor())}`)
  expect(clave).not.toBe('')
  await expect(panel.getByLabel('Color', { exact: true })).toHaveValue(clave)
  await capturar(page, info, 'color-elegido')
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(panel).toBeHidden()
  await expect(grilla(page).locator('tbody[data-grupo="gpub"]').first()).toHaveAttribute(
    'data-tono',
    clave,
  )

  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const grupos = (
    leerBorrador(conColor.id)?.definicion as unknown as {
      grupos: { id: string; tono: string }[]
    }
  ).grupos
  expect(grupos.find((g) => g.id === 'gpub')?.tono).toBe(clave)
})
