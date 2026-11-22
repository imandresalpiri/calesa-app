import { expect, type Page } from '@playwright/test'
import { literal, sql } from './sql'

export type ParteDeLaFormulaEnE2e = 'planilla' | 'hoja' | 'tarjeta'

// La fórmula de trabajo del origen (la activa; si no hay, la más nueva sin archivar), leída por SQL como la lee la pestaña sin `?formula=`. Un origen sin
// ninguna recibe «Fórmula», como la habría creado su primer guardado: el editor de una fórmula siempre tiene una (docs/UX.md › «Cotización:
// fórmulas del origen»).
export function formulaDeTrabajoDe(origenId: string): string {
  const id = sql(`select public._fdo_de_trabajo(${literal(origenId)}::uuid, true)`)
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error(`sin fórmula de trabajo en ${origenId}: ${id}`)
  return id
}

// `/configuracion/origenes/<origen>/<parte>?formula=<fórmula>` y el resto de la consulta (`consulta` con o sin `?`/`&` delante: `?panel=tablas`, `fila=…`), con
// la fórmula ya elegida: sin el `replace` que la escribe al llegar.
export function urlDeLaFormula(
  origenId: string,
  parte: ParteDeLaFormulaEnE2e = 'planilla',
  consulta = '',
  formulaId = formulaDeTrabajoDe(origenId),
): string {
  const resto = consulta.replace(/^[?&]/, '')
  return `/configuracion/origenes/${origenId}/${parte}?formula=${formulaId}${resto === '' ? '' : `&${resto}`}`
}

// Abre esa parte del editor con la fórmula de trabajo elegida y espera la URL (con `?fila=` o `?lugar=`, que se borran al leerse, sólo la fórmula).
export async function abrirLaFormula(
  page: Page,
  origenId: string,
  parte: ParteDeLaFormulaEnE2e = 'planilla',
  consulta = '',
): Promise<string> {
  const formulaId = formulaDeTrabajoDe(origenId)
  await page.goto(urlDeLaFormula(origenId, parte, consulta, formulaId))
  await expect(page).toHaveURL(enElEditor(origenId, parte, formulaId))
  return formulaId
}

// La URL de esa parte con alguna fórmula de ese origen elegida (o con `formulaId`), para `toHaveURL`.
export function enElEditor(
  origenId: string,
  parte: ParteDeLaFormulaEnE2e,
  formulaId = '[0-9a-f-]{36}',
): RegExp {
  return new RegExp(
    `/configuracion/origenes/${origenId}/${parte}\\?(.*&)?formula=${formulaId}(&|$)`,
  )
}
