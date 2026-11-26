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
import { sembrarBorrador } from './soporte/formula-versiones'
import { abrirLaInformacion, informacion } from './soporte/informacion-de-la-formula'
import {
  a1De,
  abrirPlanilla,
  barra,
  celdaDe,
  clicParaReferenciar,
  entradaDeLaCelda,
  escribirEnLaCelda,
  planilla,
  textoDeLaBarra,
} from './soporte/planilla'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'

// La fórmula al frente en la planilla (`docs/UX.md` › «Cotización: fórmula (estados propios)»): el resultado al lado antes de aplicar, las operaciones rápidas
// con sus lugares por llenar y la firma en el cursor, el error en palabras simples, la información de la versión en su modal y, en el celular, «Elegir celda».
// La fórmula de prueba con texto (`formula-editor.ts`): `pub` lo escribe el asesor, `con_ayuda` es un valor fijo de 5, `comision` = `=pub*4%` y `x_sub` un
// cálculo sin banda. Las pruebas de escribir y del modal no dependen del ancho: van sólo en escritorio (Configuración se usa ahí); las que miden la barra y la
// del celular, en los dos.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origen = { id: '', nombre: '' }
let conBorrador = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-facil-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fabia Fácil' })
  origen = await crearOrigenDeCotizar(proyecto, 'plfacil', false)
  publicarFormulaConTexto(origen.id)
  conBorrador = await crearOrigenDeCotizar(proyecto, 'plfacilb', false)
  publicarFormulaConTexto(conBorrador.id)
  sembrarBorrador(conBorrador.id, { autor: duena, sobre: 'publicada', conDiseno: true })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })
const resultado = (page: Page) =>
  barra(page).getByRole('status', { name: 'Resultado con la unidad de ejemplo' })
const renglon = (page: Page) => barra(page).locator('[data-renglon-de-la-edicion]')
const operacion = (page: Page, nombre: 'Sumar' | 'Porcentaje de' | 'Si… entonces…') =>
  barra(page).getByRole('group', { name: 'Operaciones' }).getByRole('button', { name: nombre })
const alto = async (page: Page) => (await barra(page).boundingBox())?.height ?? 0

// @sin-celular: tocar celdas y leer la caja del resultado son los mismos pasos en cualquier ancho
test('sumar dos celdas tocándolas: el resultado se ve al lado antes de aplicar y Ejemplo dice lo mismo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  await escribirEnLaCelda(page, celdaDe(page, 'pub', 'D'), '100')
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')

  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await page.keyboard.press('=')
  const entrada = entradaDeLaCelda(page)
  await expect(entrada).toBeFocused()
  await clicParaReferenciar(page, celdaDe(page, 'pub'))
  await entrada.press('+')
  await clicParaReferenciar(page, celdaDe(page, 'con_ayuda'))
  await expect(entrada).toHaveValue(`=${pub}+${conAyuda}`)
  // Antes de aplicar: la cifra que daría, con la unidad de ejemplo.
  await expect(resultado(page)).toContainText(usd(105))
  await capturar(page, info, 'resultado-al-lado')
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
  await expect(celdaDe(page, FILA_CON_TEXTO.id, 'D')).toContainText(usd(105))
  await expect(resultado(page)).toHaveCount(0)
})

// @sin-celular: el cursor, la firma y Tab dependen del texto, no del ancho de la pantalla
test('«Si… entonces…» deja =SI(; ; ) con el cursor en el primer lugar, la firma lo resalta y Tab o «Siguiente» avanzan', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const texto = textoDeLaBarra(page)
  await celdaDe(page, 'x_sub').click()
  await texto.fill('=')
  await operacion(page, 'Si… entonces…').click()
  await expect(texto).toBeFocused()
  await expect(texto).toHaveValue('=SI(; ; )')
  await expect(texto).toHaveJSProperty('selectionStart', '=SI('.length)
  const firma = renglon(page).locator('[data-firma-en-el-cursor]')
  await expect(firma).toHaveText('SI(condición; si se cumple; si no)')
  await expect(firma.locator('[data-valor-actual]')).toHaveText('condición')
  await capturar(page, info, 'si-entonces-con-la-firma')

  await texto.pressSequentially('1>0')
  await texto.press('Tab')
  await expect(texto).toBeFocused()
  await expect(texto).toHaveJSProperty('selectionStart', '=SI(1>0; '.length)
  await expect(firma.locator('[data-valor-actual]')).toHaveText('si se cumple')
  await texto.pressSequentially('2')
  await renglon(page).getByRole('button', { name: 'Ir al siguiente lugar' }).click()
  await expect(texto).toHaveJSProperty('selectionStart', '=SI(1>0; 2; '.length)
  await texto.pressSequentially('3')
  // Sin lugares, «Siguiente» se va y Enter aplica.
  await expect(renglon(page).getByRole('button', { name: 'Ir al siguiente lugar' })).toHaveCount(0)
  await texto.press('Enter')
  await expect(celdaDe(page, 'x_sub')).toHaveText('=SI(1>0; 2; 3)')
})

// @sin-celular: el salto del cursor tras tocar una celda es el mismo en cualquier ancho
test('«Sumar» y tocar dos celdas deja =C5+C7: el cursor salta el «+» tras la primera', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')
  const texto = textoDeLaBarra(page)
  await celdaDe(page, 'x_sub').click()
  await texto.fill('=')
  await operacion(page, 'Sumar').click()
  await expect(texto).toHaveValue('=+')
  await expect(renglon(page)).toContainText('Toca una celda para usarla.')
  await clicParaReferenciar(page, celdaDe(page, 'pub'))
  await expect(texto).toHaveValue(`=${pub}+`)
  await clicParaReferenciar(page, celdaDe(page, 'con_ayuda'))
  await expect(texto).toHaveValue(`=${pub}+${conAyuda}`)
  await expect(resultado(page)).toContainText(usd(5))
})

// @sin-celular: el mensaje y el tramo marcado salen del texto escrito, no del ancho
test('un paréntesis sin cerrar se dice en palabras simples, con su tramo marcado y la caja del resultado vacía', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const conAyuda = await a1De(page, 'con_ayuda')
  const texto = textoDeLaBarra(page)
  await celdaDe(page, 'x_sub').click()
  await texto.fill(`=SUMA(${pub};${conAyuda}`)
  await texto.press('Enter')
  await expect(planilla(page).getByRole('alert')).toContainText('Falta cerrar un paréntesis.')
  await expect(barra(page).locator('.decoration-wavy').first()).toBeVisible()
  await expect(resultado(page)).toBeEmpty()
  await capturar(page, info, 'error-en-palabras-simples')
})

// @sin-celular: el modal y su URL son los mismos en los dos anchos; el celular lo mira su propia prueba
test('«Información de la fórmula» abre el modal con la publicada y el borrador; recargar lo deja abierto y descartar cambia a su confirmación', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, conBorrador.id)
  // Fuera del modal no hay tarjetas de la versión: la planilla va al frente.
  await expect(page.getByRole('region', { name: 'Publicada' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Borrador' })).toHaveCount(0)
  const modal = await abrirLaInformacion(page)
  await expect(page).toHaveURL(/panel=info-formula/)
  await expect(modal.getByRole('region', { name: 'Publicada' })).toContainText(
    /Publicada: versión \d+/,
  )
  await expect(modal.getByRole('region', { name: 'Borrador' })).toContainText(
    /Empezó sobre la versión \d+\./,
  )
  await capturar(page, info, 'informacion-de-la-formula')
  await page.reload()
  await expect(informacion(page)).toBeVisible()
  await informacion(page).getByRole('button', { name: 'Descartar el borrador…' }).click()
  await expect(page).toHaveURL(/panel=descartar-borrador/)
  await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toContainText(
    'no se puede deshacer',
  )
})

test('la barra de fórmula no salta mientras se escribe: ni el resultado ni la firma cambian su alto', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const texto = textoDeLaBarra(page)
  await celdaDe(page, 'x_sub').click()
  await texto.fill('=')
  await expect(resultado(page)).toBeVisible()
  const escribiendo = await alto(page)
  const altoDelRenglon = async () => (await renglon(page).boundingBox())?.height ?? 0
  const renglonSinFirma = await altoDelRenglon()
  // Con la firma.
  await operacion(page, 'Si… entonces…').click()
  await expect(renglon(page).locator('[data-firma-en-el-cursor]')).toBeVisible()
  expect(await altoDelRenglon()).toBe(renglonSinFirma)
  expect(await alto(page)).toBe(escribiendo)
  // Con la cifra y sin ella.
  await texto.fill('=1+2')
  await expect(resultado(page)).not.toBeEmpty()
  expect(await alto(page)).toBe(escribiendo)
  await texto.fill('=1+')
  await expect(resultado(page)).toBeEmpty()
  expect(await alto(page)).toBe(escribiendo)
})

test('en el celular, «Elegir celda» cierra el teclado, tocar una C la inserta y el foco vuelve al texto; el modal va a pantalla completa', async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, '«Elegir celda» es del puntero grueso')
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const pub = await a1De(page, 'pub')
  const texto = textoDeLaBarra(page)
  await celdaDe(page, 'x_sub').click()
  await texto.fill('=')
  const elegir = renglon(page).getByRole('button', { name: 'Elegir celda' })
  await expect(elegir).toBeVisible()
  expect((await elegir.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await elegir.click()
  await expect(elegir).toHaveAttribute('aria-pressed', 'true')
  await expect(renglon(page)).toContainText('Toca la celda que quieres usar.')
  await expect(texto).not.toBeFocused()
  await capturar(page, info, 'elegir-celda')
  await celdaDe(page, 'pub').click()
  await expect(texto).toHaveValue(`=${pub}`)
  await expect(texto).toBeFocused()
  await expect(elegir).toHaveAttribute('aria-pressed', 'false')
  await texto.press('Escape')

  const modal = await abrirLaInformacion(page)
  const ancho = page.viewportSize()?.width ?? 0
  // Entra con una animación de escala: se mide ya asentado.
  await expect
    .poll(async () => Math.round((await modal.boundingBox())?.width ?? 0))
    .toBeGreaterThanOrEqual(ancho - 1)
  await capturar(page, info, 'informacion-en-el-celular')
  await modal.getByRole('button', { name: 'Cerrar' }).click()
  await expect(modal).toHaveCount(0)

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  // Al 200 % la barra pegada ocupa casi toda la pantalla (pulido, en `docs/PENDIENTES.md`): sólo se mira que nada ensanche la página.
  await sinScrollHorizontal(page)
  await capturar(page, info, 'barra-al-200')
})
