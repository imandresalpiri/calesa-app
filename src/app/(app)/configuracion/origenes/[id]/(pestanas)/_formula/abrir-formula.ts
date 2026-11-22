import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import {
  leerFormulaDeTrabajo,
  leerFormulasDelOrigen,
  leerLaFormulaDelOrigen,
  type FormulaDeLaLista,
  type FormulaDelOrigen,
  type ListaDeFormulasDelOrigen,
} from '@/modules/cotizaciones'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_LA_FORMULA, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { abrirOrigen, type OrigenAbierto } from '../../abrir-origen'

export type FormulaDeLaPestana =
  | Exclude<OrigenAbierto, { tipo: 'abierto' }>
  | (Extract<OrigenAbierto, { tipo: 'abierto' }> & {
      // Las fórmulas sin archivar del origen: la lista del selector de la barra.
      lectura: ListaDeFormulasDelOrigen
      // La elegida (`?formula=`) o, sin ella, la de trabajo; nula si el origen no tiene ninguna.
      elegida: FormulaDeLaLista | null
      // Lo que reciben la planilla, la hoja y la tarjeta (lo que mandan sus escrituras).
      formula: FormulaDelOrigen | null
      archivada: boolean
      // Se pidió una que no es de este origen, no existe o no se ve: se dibuja la de trabajo y se avisa.
      ignorada: boolean
    })

// Lo que comprueban las pestañas Planilla, Hoja y Tarjeta (cada página sola: un layout no protege a su página): el origen y la pestaña (`abrirOrigen()`), la
// lista de sus fórmulas (≤ 51 filas por `formulas_del_origen_origen_idx`) y la elegida por su id **en ese origen** (la policy vuelve a decidir). Una pedida que
// no está se ignora: va la de trabajo (`leerFormulaDeTrabajo()`: la activa o, sin activa, la más nueva sin archivar). Una lectura que falla sube al
// `error.tsx`. Una vez por request.
export const abrirLaFormulaDeLaPestana = cache(
  async (
    origenId: string,
    parte: ParteDeLaFormula,
    pedida: string | null,
  ): Promise<FormulaDeLaPestana> => {
    const abierto = await abrirOrigen(origenId, parte)
    if (abierto.tipo !== 'abierto') {
      return abierto
    }
    const id = abierto.origen.id
    const valida = pedida !== null && z.guid().safeParse(pedida).success
    const [lectura, laPedida] = await Promise.all([
      leerFormulasDelOrigen(id).then(datosO),
      valida ? leerLaFormulaDelOrigen(id, pedida).then(datosO) : Promise.resolve(null),
    ])
    const elegida = laPedida?.formula ?? (await laDeTrabajo(id, lectura))
    return {
      ...abierto,
      lectura,
      elegida,
      formula: elegida ? comoFormula(elegida) : null,
      archivada: elegida?.archivadaEn != null,
      ignorada: pedida !== null && laPedida === null,
    }
  },
)

// La de trabajo del origen, de la lista si está (la activa casi siempre está) o leída sola; nula si no tiene ninguna.
async function laDeTrabajo(
  origenId: string,
  lectura: ListaDeFormulasDelOrigen,
): Promise<FormulaDeLaLista | null> {
  const trabajo = datosO(await leerFormulaDeTrabajo(origenId))
  if (trabajo === null) {
    return null
  }
  return (
    lectura.formulas.find((f) => f.id === trabajo.id) ??
    datosO(await leerLaFormulaDelOrigen(origenId, trabajo.id))?.formula ??
    null
  )
}

const comoFormula = (elegida: FormulaDeLaLista): FormulaDelOrigen => ({
  id: elegida.id,
  nombre: elegida.nombre,
  activa: elegida.activa,
  actualizadoEn: elegida.actualizadoEn,
})

// La fórmula pedida en la consulta de la página (`?formula=<id>`): un texto suelto o nada.
export function formulaPedida(
  consulta: Record<string, string | string[] | undefined>,
): string | null {
  const valor = consulta[CLAVE_DE_LA_FORMULA]
  return typeof valor === 'string' && valor !== '' ? valor : null
}
