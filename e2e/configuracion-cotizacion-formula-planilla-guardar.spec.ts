// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { cerrarLaInformacion, seccionDeLaInformacion } from './soporte/informacion-de-la-formula'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { detalleDelEstado, estadoDeLaBarra } from './soporte/barra-de-la-formula'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  AUXILIAR_DEL_PORCENTAJE,
  FILA_CON_TEXTO,
  ajustarConstante,
  publicarFormulaConTexto,
} from './soporte/formula-editor'
import {
  crearBorradorComoOtraPersona,
  guardarComoOtraPersona,
  idDeLaPublicada,
  leerBorrador,
  textoGuardado,
} from './soporte/formula-editor-guardar'
import {
  a1De,
  abrirPlanilla,
  celdaDe,
  entradaDeLaCelda,
  escribirEnLaCelda,
  filaDe,
  grilla,
  guardado,
  guardar,
  menuDeLaFila,
  planilla,
  textoDeLaBarra,
} from './soporte/planilla'
import { literal, sql } from './soporte/sql'

// «Guardar el borrador» de la planilla (`docs/UX.md` › «Cotización: fórmula (estados propios)»): sobre la publicada crea el borrador con su diseño; sobre el borrador
// lo pisa con su hora, sin releer la fila; guarda el texto que reescribió el ⚙ (4-5); si otra persona guardó o empezó un borrador, dice el texto de la base con
// «Recargar», que trae lo de ella; avisa qué filas tendrá que mostrar el diseño para publicar (P1: guardar y avisar). Lo escrito en la planilla va en A1 y se
// guarda en ids.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let otra = ''
let crea = { id: '', nombre: '' }
let ajustado = { id: '', nombre: '' }
let choca = { id: '', nombre: '' }
let empieza = { id: '', nombre: '' }
let sinCelda = { id: '', nombre: '' }
let estados = { id: '', nombre: '' }
let auxiliar = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-guardar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Gema Guarda' })
  otra = correoDePrueba(`otra-guardar-${proyecto}`)
  await crearPersona({ email: otra, contrasena: CONTRASENA, nombre: 'Otto Otra', invitada: true })
  crea = await crearOrigenDeCotizar(proyecto, 'gcrea', false)
  ajustado = await crearOrigenDeCotizar(proyecto, 'gajuste', false)
  choca = await crearOrigenDeCotizar(proyecto, 'gchoca', false)
  empieza = await crearOrigenDeCotizar(proyecto, 'gempieza', false)
  sinCelda = await crearOrigenDeCotizar(proyecto, 'gsincelda', false)
  estados = await crearOrigenDeCotizar(proyecto, 'gestados', false)
  auxiliar = await crearOrigenDeCotizar(proyecto, 'gauxiliar', false)
  for (const o of [crea, ajustado, choca, empieza, sinCelda, estados, auxiliar]) {
    publicarFormulaConTexto(o.id)
  }
  ajustarConstante(ajustado.id, AUXILIAR_DEL_PORCENTAJE, 0.06)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const comision = (page: Page) => celdaDe(page, FILA_CON_TEXTO.id)
const alerta = (page: Page, texto: string) =>
  planilla(page).getByRole('alert').filter({ hasText: texto })

// Escribe la comisión como un porcentaje de Pública (en A1: `=C7*5%`).
async function escribirLaComision(page: Page, resto: string) {
  await escribirEnLaCelda(page, comision(page), `=${await a1De(page, 'pub')}${resto}`)
}

async function laComisionDice(page: Page, resto: string) {
  await comision(page).click()
  await expect(textoDeLaBarra(page)).toHaveValue(`=${await a1De(page, 'pub')}${resto}`)
}

// La barra de la fórmula dice sobre qué se edita: el borrador, con quién lo guardó.
async function borradorDe(page: Page, autor: string) {
  await expect(estadoDeLaBarra(page)).toHaveText('Borrador')
  await expect(detalleDelEstado(page)).toHaveText(autor)
}

async function publicar(page: Page, nota: string) {
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill(nota)
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  return modal
}

const publicada = (origenId: string, columna: string) =>
  sql(
    `select ${columna} from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`,
  )

const disenoDe = (id: string) =>
  sql(`select diseno::text from public.formulas where id = ${literal(id)}::uuid`)

test('G1: sobre la publicada crea el borrador con su diseño; el segundo guardado pisa con la hora nueva, sin releer ni volver a montar la planilla', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, crea.id)
  await expect(estadoDeLaBarra(page)).toHaveText('Publicada v1')
  await escribirLaComision(page, '*5%')
  const lecturas: string[] = []
  page.on('request', (r) => {
    if (/\/rest\/v1\/formulas\?.*select=/.test(r.url())) lecturas.push(r.url())
  })
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const laPublicada = idDeLaPublicada(crea.id)
  const primero = leerBorrador(crea.id)
  expect(primero).not.toBeNull()
  expect(textoGuardado(primero!, FILA_CON_TEXTO.id)).toBe('=pub*5%')
  expect(primero!.params[AUXILIAR_DEL_PORCENTAJE]).toBe(0.05)
  expect(primero!.version_origen_id).toBe(laPublicada)
  expect(JSON.stringify(primero!.diseno)).toBe(JSON.stringify(JSON.parse(disenoDe(laPublicada))))
  await borradorDe(page, 'Gema Guarda')

  // Sin salir de la planilla: otro cambio y otro guardado pisan el mismo borrador con la hora que devolvió el primero.
  await escribirLaComision(page, '*6%')
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const segundo = leerBorrador(crea.id)
  expect(segundo!.id).toBe(primero!.id)
  expect(textoGuardado(segundo!, FILA_CON_TEXTO.id)).toBe('=pub*6%')
  expect(segundo!.actualizado_en).not.toBe(primero!.actualizado_en)
  expect(lecturas).toEqual([])
  await expect(guardar(page)).toBeDisabled()
  // El borrador está en «Información de la fórmula», sin «Editar»: se edita en la planilla.
  const borrador = await seccionDeLaInformacion(page, 'Borrador')
  await expect(borrador).toBeVisible()
  await expect(borrador.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await cerrarLaInformacion(page)
  await laComisionDice(page, '*6%')
})

test('G2 (4-5): tras un ⚙, guardar escribe el texto con el valor nuevo, sin tocar la fila', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, ajustado.id)
  await comision(page).click()
  await expect(planilla(page)).toContainText(/Con ⚙ se cambió 4\s?% por 6\s?%/)
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  expect(textoGuardado(leerBorrador(ajustado.id)!, FILA_CON_TEXTO.id)).toBe('=pub*6%')
  await laComisionDice(page, '*6%')
  await expect(planilla(page)).not.toContainText('Con ⚙')
})

test('G3: si otra persona guardó, el texto de la base con «Recargar», que trae lo de ella; si empezó un borrador, «Ya hay un borrador»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, choca.id)
  await escribirLaComision(page, '*5%')
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')

  guardarComoOtraPersona(choca.id, '=pub*7%')
  await escribirLaComision(page, '*8%')
  await guardar(page).click()
  const conflicto = alerta(page, 'El borrador cambió')
  await expect(conflicto).toContainText('El borrador cambió después de que lo abriste')
  await expect(conflicto).toContainText(
    'Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se pierde.',
  )
  await laComisionDice(page, '*8%')
  expect(textoGuardado(leerBorrador(choca.id)!, FILA_CON_TEXTO.id)).toBe('=pub*7%')
  await conflicto.getByRole('button', { name: 'Recargar', exact: true }).click()
  await expect(conflicto).toBeHidden()
  await laComisionDice(page, '*7%')

  await abrirPlanilla(page, empieza.id)
  crearBorradorComoOtraPersona(empieza.id, otra)
  await escribirLaComision(page, '*9%')
  await guardar(page).click()
  const yaHay = alerta(page, 'Ya hay un borrador')
  await expect(yaHay).toContainText('Ya hay un borrador: lo empezó Otto Otra')
  await yaHay.getByRole('button', { name: 'Recargar', exact: true }).click()
  await borradorDe(page, 'Otto Otra')
  await laComisionDice(page, '*4%')
})

test('G4 (P1): un valor fijo sin celda en el diseño se guarda con su aviso, y publicar lo rechaza', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, sinCelda.id)
  await menuDeLaFila(page, FILA_CON_TEXTO.id)
  await page.getByRole('menuitem', { name: 'Insertar abajo', exact: true }).click()
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await entradaDeLaCelda(page).pressSequentially('Seguro de carga')
  await entradaDeLaCelda(page).press('Enter')
  await expect(entradaDeLaCelda(page)).toBeHidden()
  const nueva = grilla(page).locator('tr[data-fila]').filter({ hasText: 'Seguro de carga' })
  await expect(nueva).toHaveCount(1)
  const id = (await nueva.getAttribute('data-fila')) ?? ''
  await escribirEnLaCelda(page, celdaDe(page, id), '150')
  await expect(planilla(page)).toContainText(
    'Para publicar, el diseño de la hoja tiene que mostrar: «Seguro de carga». Puedes guardar igual.',
  )
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  expect(leerBorrador(sinCelda.id)!.params[id]).toBe(150)

  const modal = await publicar(page, 'Con seguro')
  await expect(modal).toContainText(`«${id}» no está en ninguna sección del diseño.`)
  // No publicó: el borrador sigue y la publicada es la de antes.
  expect(leerBorrador(sinCelda.id)).not.toBeNull()
  expect(publicada(sinCelda.id, 'version')).toBe('1')
})

test('G8 (P2): la auxiliar de un número nuevo no pide celda: no se avisa y publicar entra (4.21-3b-2)', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, auxiliar.id)
  await escribirLaComision(page, '*5%+100')
  await expect(planilla(page)).not.toContainText('tiene que mostrar')
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')

  const modal = await publicar(page, 'Con un número nuevo')
  await expect(modal).toBeHidden()
  expect(publicada(auxiliar.id, 'version')).toBe('2')
  // `comision__3` (el 100) quedó en la fórmula, sin celda: la visibilidad no la nombra; la del 5 % sigue con la suya.
  expect(publicada(auxiliar.id, `(params ->> 'comision__3')`)).toBe('100')
  expect(publicada(auxiliar.id, `(visibilidad ? 'comision__3')::text`)).toBe('false')
  expect(publicada(auxiliar.id, `(visibilidad ? '${AUXILIAR_DEL_PORCENTAJE}')::text`)).toBe('true')
})

test('G5: con una celda escribiéndose, sin cambios o con la fórmula inválida, el botón espera y dice por qué', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, estados.id)
  await expect(guardar(page)).toBeDisabled()
  await expect(guardado(page)).toHaveText('No hay cambios por guardar.')
  await comision(page).dblclick()
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await expect(guardar(page)).toBeDisabled()
  await expect(guardado(page)).toHaveText('Aplica o descarta lo que escribes en la planilla.')
  await entradaDeLaCelda(page).press('Escape')
  await expect(entradaDeLaCelda(page)).toBeHidden()

  const activar = await a1De(page, 'activar')
  const pub = await a1De(page, 'pub')
  await escribirEnLaCelda(page, celdaDe(page, 'total'), `=SI(${activar}; ${pub})`)
  await expect(filaDe(page, 'total')).toHaveAttribute('data-rechazo', '')
  await expect(planilla(page)).toContainText('no puede depender de una variante')
  await expect(guardar(page)).toBeDisabled()
  await expect(guardado(page)).toHaveText('Corrige lo marcado para guardar.')
  expect(leerBorrador(estados.id)).toBeNull()
})
