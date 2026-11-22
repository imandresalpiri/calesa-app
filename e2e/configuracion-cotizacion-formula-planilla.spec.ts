// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { barraDeLaFormula } from './soporte/barra-de-la-formula'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { FILA_CON_TEXTO, publicarFormulaConTexto } from './soporte/formula-editor'
import { publicarPlantillaDeLaMini } from './soporte/plantilla'
import { literal, sql } from './soporte/sql'
import {
  a1De,
  abrirCostado,
  abrirPlanilla,
  barra,
  celdaDe,
  escribirEnLaCelda,
  guardado,
  guardar,
  planilla,
  tarjetaDelCostado,
  textoDeLaBarra,
  totalesDelCostado,
} from './soporte/planilla'

// La planilla de la fórmula (`docs/UX.md` › «Cotización: fórmula (estados propios)»): la pestaña «Planilla» del origen, una hoja de cálculo con las
// columnas A, B, C y Ejemplo y la guía de la barra; cambiar un valor fijo en C mueve «Totales» y la tarjeta en vivo (los paneles al costado, abiertos a la vez no:
// se mira uno y después el otro); un cálculo se lee y se escribe en la barra de fórmula con referencias A1 y se guarda con ids; la unidad de ejemplo se tipea en
// Ejemplo de lo que escribe el asesor; se guarda el borrador y se publica con nota.
// La fórmula de prueba con texto (`formula-editor.ts`): `con_ayuda` es una constante de 5 en el grupo `gpub`, `pub` un input del mismo grupo (en la variante por
// defecto), `comision` = `=pub*4%` (fuera del total) y lo demás vale 0; el total en dólares es la moneda local ÷ el mismo tipo de cambio. La tarjeta es la de grupos
// (forma 1) con sus dos grupos, publicada.

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-planilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Planilla' })
  origen = await crearOrigenDeCotizar(proyecto, 'planilla', false)
  publicarFormulaConTexto(origen.id)
  publicarPlantillaDeLaMini(origen.id, {
    grupos: [{ grupo: 'gpub' }, { grupo: 'gx' }],
    total: { etiqueta: 'Total' },
    logo: false,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })

test('la planilla: valor fijo, barra de fórmula en A1, unidad de ejemplo, guardar y publicar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)

  // (1) La grilla con sus columnas y la guía de la barra.
  for (const columna of ['A · concepto', 'B · %', 'C · valor', 'Ejemplo']) {
    await expect(
      planilla(page).getByRole('columnheader', { name: columna, exact: true }),
    ).toBeVisible()
  }
  await expect(barra(page)).toContainText('Escribe = y toca las celdas: =C5+C7')
  const totales = totalesDelCostado(page)
  const tarjeta = tarjetaDelCostado(page)
  await abrirCostado(page, 'Totales')
  await expect(totales).toContainText(usd(5))
  await abrirCostado(page, 'Tarjeta')
  await expect(tarjeta).toContainText(usd(5))

  // (2) Cambiar un valor fijo en C: «Totales» y la tarjeta en vivo cambian (desde 1024 px el panel no tapa la grilla).
  await escribirEnLaCelda(page, celdaDe(page, 'con_ayuda'), '7')
  await expect(tarjeta).toContainText(usd(7))
  await abrirCostado(page, 'Totales')
  await expect(totales).toContainText(usd(7))

  // (3) Elegir un cálculo: la barra lo muestra en A1; se reescribe ahí y Enter aplica.
  const pub = await a1De(page, 'pub')
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  const texto = textoDeLaBarra(page)
  await expect(texto).toHaveAccessibleName(
    `Fórmula de ${await a1De(page, FILA_CON_TEXTO.id)}, ${FILA_CON_TEXTO.etiqueta}`,
  )
  await expect(texto).toHaveValue(`=${pub}*4%`)
  await texto.fill(`=${pub}*5%`)
  await texto.press('Enter')
  await celdaDe(page, FILA_CON_TEXTO.id).click()
  await expect(texto).toHaveValue(`=${pub}*5%`)

  // (4) La unidad de ejemplo: tipear «Pública» en Ejemplo mueve el cálculo y los totales.
  await escribirEnLaCelda(page, celdaDe(page, 'pub', 'D'), '100')
  await expect(celdaDe(page, FILA_CON_TEXTO.id, 'D')).toContainText(usd(5))
  await expect(totales).toContainText(usd(107))
  await abrirCostado(page, 'Tarjeta')
  await expect(tarjeta).toContainText(usd(107))

  // (5) Guardar el borrador y publicarlo con nota: lo guardado nombra ids, nunca la celda.
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  await barraDeLaFormula(page).getByRole('button', { name: 'Publicar…', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Desde la planilla')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = (columna: string) =>
    sql(
      `select ${columna} from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    )
  await expect.poll(() => publicada('version')).toBe('2')
  expect(publicada(`params ->> 'con_ayuda'`)).toBe('7')
  expect(
    publicada(
      `(select n ->> 'texto' from jsonb_array_elements(definicion -> 'nodos') n where n ->> 'id' = '${FILA_CON_TEXTO.id}')`,
    ),
  ).toBe('=pub*5%')
})
