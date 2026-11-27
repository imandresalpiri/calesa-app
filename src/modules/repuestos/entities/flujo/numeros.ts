import { z } from 'zod'
import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { FaseDeLaCadena } from './cadena-filas'

// Los números de repuestos del Modo Live (glosario: «Modo Live»): por fase del flujo, cuántos ítems y de cuántos proyectos, sin descripciones ni
// enlaces. Puro: valida y cuenta; la lectura es de `infra/flujo/numeros.ts`. Cada número sale de `limit TOPE + 1` (`.claude/rules/escala.md`).

/** Lo que se cuenta por fase: hasta acá es exacto; más es «500+». */
export const TOPE_DE_LOS_NUMEROS = TOPE_DE_LO_CARGADO

/** Las columnas de un ítem para contarlo: su proyecto, embebido sólo para filtrar los de la papelera. */
export const COLUMNAS_DE_LOS_NUMEROS = 'proyecto_id, proyecto:repuestos_proyectos!inner(id)'

export type ConteosDeLaFase = { items: ConteoAcotado; proyectos: ConteoAcotado }

export type NumerosDeLaFase = ConteosDeLaFase & {
  faseId: string | null
  nombre: string | null
  color: string | null
}

const esquemaDeFila = z.object({ proyecto_id: z.guid() })

/**
 * De los ítems de una fase leídos con `limit tope + 1`: los ítems y sus proyectos distintos. Con más ítems que el tope, los proyectos son
 * los de lo leído y también llevan «+» (puede haber otros entre los que no se leyeron).
 */
export function conteosDesde(filas: unknown, tope: number): Resultado<ConteosDeLaFase> {
  const leidas = z.array(esquemaDeFila).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const items = conteoAcotado(leidas.data.length, tope)
  const proyectos = new Set(leidas.data.slice(0, tope).map((fila) => fila.proyecto_id))
  return ok({ items, proyectos: { n: proyectos.size, hayMas: items.hayMas } })
}

const SIN_NADA: ConteosDeLaFase = {
  items: { n: 0, hayMas: false },
  proyectos: { n: 0, hayMas: false },
}

/** Las tarjetas como las columnas de la Cadena: «Sin fase» primera si tiene ítems y se saltea una fase jubilada sin ítems. */
export function numerosDe(
  fases: readonly FaseDeLaCadena[],
  conteos: { sinFase: ConteosDeLaFase; porFase: ReadonlyMap<string, ConteosDeLaFase> },
): NumerosDeLaFase[] {
  const numeros: NumerosDeLaFase[] = []
  if (conteos.sinFase.items.n > 0) {
    numeros.push({ faseId: null, nombre: null, color: null, ...conteos.sinFase })
  }
  for (const fase of fases) {
    const conteo = conteos.porFase.get(fase.id) ?? SIN_NADA
    if (!fase.activa && conteo.items.n === 0) continue
    numeros.push({ faseId: fase.id, nombre: fase.nombre, color: fase.color, ...conteo })
  }
  return numeros
}
