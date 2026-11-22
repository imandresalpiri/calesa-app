// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  AUXILIAR_DEL_PORCENTAJE,
  FILA_CON_TEXTO,
  ajustarConstante,
  publicarFormulaConTexto,
} from './soporte/formula-editor'
import {
  borrarLoDePrevia,
  sembrarBorradorDePrevia,
  sembrarTabla,
  sembrarTipoDeCambio,
} from './soporte/formula-editor-previa'
import {
  a1De,
  abrirPlanilla,
  celdaDe,
  entradaDeLaCelda,
  escribirEnLaCelda,
  filaDe,
  planilla,
  textoDeLaBarra,
} from './soporte/planilla'

// El texto de una fila en la planilla (`docs/UX.md` › «Cotización: fórmula (estados propios)»): la barra de fórmula lo lee en A1 y lo compila al aplicar, con el error
// bajo la barra y lo escrito a la vista. Cierra 4-6 (2.001 caracteres) y 4-5 (tras un ⚙ el texto dice el valor nuevo, o que ya no manda, y recompilar no pisa el ⚙
// sin preguntar). Lo aplicado vive en la pestaña del navegador hasta guardar: vuelve al recargar, con «Descartar». Los valores de Ejemplo salen de la unidad de ejemplo
// en 0, el tipo de cambio de hoy y la tabla que manda (la del origen sobre la compartida; la que la fórmula congeló, sobre las dos).
test.describe.configure({ mode: 'serial' })

const TC = 7

let proyecto = ''
let duena = ''
let conTexto = { id: '', nombre: '' }
let ajustado = { id: '', nombre: '' }
let negativo = { id: '', nombre: '' }
let delOrigen = { id: '', nombre: '' }
let soloCompartida = { id: '', nombre: '' }
let congelada = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-texto-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tea Texto' })
  conTexto = await crearOrigenDeCotizar(proyecto, 'pltexto', false)
  publicarFormulaConTexto(conTexto.id)
  // El ⚙ deja la auxiliar del `4%` en 5 % (el texto lo puede escribir) y en −3 % (no puede: un negativo no se escribe).
  ajustado = await crearOrigenDeCotizar(proyecto, 'plajuste', false)
  publicarFormulaConTexto(ajustado.id)
  ajustarConstante(ajustado.id, AUXILIAR_DEL_PORCENTAJE, 0.05)
  negativo = await crearOrigenDeCotizar(proyecto, 'plnegat', false)
  publicarFormulaConTexto(negativo.id)
  ajustarConstante(negativo.id, AUXILIAR_DEL_PORCENTAJE, -0.03)
  // La compartida vale 0,5 y la del primer origen 0,25: ahí gana la del origen. La congelada (0,9) gana a las dos.
  sembrarTipoDeCambio(proyecto, TC)
  delOrigen = await crearOrigenDeCotizar(proyecto, 'plorig', false)
  soloCompartida = await crearOrigenDeCotizar(proyecto, 'plcomp', false)
  congelada = await crearOrigenDeCotizar(proyecto, 'plcong', false)
  sembrarTabla({ proyecto, origenId: null, factor: 0.5 })
  sembrarTabla({ proyecto, origenId: delOrigen.id, factor: 0.25 })
  for (const o of [delOrigen, soloCompartida, congelada]) {
    sembrarBorradorDePrevia(o.id, duena, proyecto, o === congelada ? 0.9 : undefined)
  }
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('4-6: 2.001 caracteres dan el error bajo la barra y no cambian nada; con 2.000 se aplica', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, conTexto.id)
  const pub = await a1De(page, 'pub')
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  const barra = textoDeLaBarra(page)
  await expect(barra).toHaveValue(`=${pub}*4%`)
  // Sin referencias: el largo que cuenta es el del texto guardado (con ids), y `pub` es más largo que su celda.
  await barra.fill('=1'.padEnd(2001, ' '))
  await barra.press('Enter')
  await expect(planilla(page).getByRole('alert')).toContainText(
    'El texto de la fila pasa de 2.000 caracteres.',
  )
  await expect(barra).toHaveAttribute('aria-invalid', 'true')
  // Sigue escrito y la fórmula no cambió: Esc vuelve al texto de antes.
  await barra.press('Escape')
  await expect(barra).toHaveValue(`=${pub}*4%`)
  await barra.fill('=1'.padEnd(2000, ' '))
  await barra.press('Enter')
  await expect(planilla(page).getByRole('alert')).toHaveCount(0)
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(barra).not.toHaveAttribute('aria-invalid', 'true')
})

test('4-5: tras un ⚙ que el texto puede escribir, la barra dice el valor nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, ajustado.id)
  const pub = await a1De(page, 'pub')
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${pub}*5%`)
  await expect(planilla(page)).toContainText(/Con ⚙ se cambió 4\s?% por 5\s?%/)
})

test('4-5: tras un ⚙ que el texto no puede escribir, el texto ya no manda y aplicarlo pregunta antes de pisar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, negativo.id)
  const pub = await a1De(page, 'pub')
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${pub}*4%`)
  await expect(planilla(page)).toContainText(/El texto ya no manda: con ⚙ quedó -3\s?%/)
  await celdaDe(page, FILA_CON_TEXTO.id).dblclick()
  await expect(entradaDeLaCelda(page)).toHaveValue(`=${pub}*4%`)
  await entradaDeLaCelda(page).press('Enter')
  const aviso = planilla(page).getByRole('alert')
  await expect(aviso).toContainText('confirma que quieres pisarlo')
  await aviso.getByRole('button', { name: 'Pisar el valor', exact: true }).click()
  await expect(entradaDeLaCelda(page)).toBeHidden()
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(planilla(page)).not.toContainText('ya no manda')
})

test('un error de lo escrito queda con su tramo; un texto que compila y deja la fórmula inválida aplica y marca su fila', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, conTexto.id)
  const pub = await a1De(page, 'pub')
  const activar = await a1De(page, 'activar')
  await celdaDe(page, 'total').dblclick()
  await entradaDeLaCelda(page).fill(`=${pub}+`)
  await entradaDeLaCelda(page).press('Enter')
  await expect(planilla(page).getByRole('alert')).toBeVisible()
  await expect(entradaDeLaCelda(page)).toHaveValue(`=${pub}+`)
  await expect(entradaDeLaCelda(page)).toHaveAttribute('aria-invalid', 'true')
  await entradaDeLaCelda(page).press('Escape')
  await expect(entradaDeLaCelda(page)).toBeHidden()

  await escribirEnLaCelda(page, celdaDe(page, 'total'), `=SI(${activar}; ${pub})`)
  await expect(filaDe(page, 'total')).toHaveAttribute('data-rechazo', '')
  await expect(planilla(page)).toContainText(/no puede depender de una variante/)
  await celdaDe(page, 'total').click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=SI(${activar}; ${pub})`)
})

test('lo aplicado vuelve al recargar, con su «Descartar»', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, conTexto.id)
  const pub = await a1De(page, 'pub')
  await escribirEnLaCelda(page, celdaDe(page, FILA_CON_TEXTO.id), `=${pub}*7%`)
  await page.reload()
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${pub}*7%`)
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${pub}*4%`)
})

test('los valores de Ejemplo: la unidad de ejemplo, el tipo de cambio de hoy y la tabla que manda', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, delOrigen.id)
  await expect(celdaDe(page, 'doble', 'D')).toContainText(/1\.800,00/)
  await expect(celdaDe(page, 'tc', 'D')).toContainText(String(TC))
  await expect(celdaDe(page, 'factor', 'D')).toContainText('0,25')
  await abrirPlanilla(page, soloCompartida.id)
  await expect(celdaDe(page, 'factor', 'D')).toContainText('0,5')
  await abrirPlanilla(page, congelada.id)
  await expect(celdaDe(page, 'factor', 'D')).toContainText('0,9')
})
