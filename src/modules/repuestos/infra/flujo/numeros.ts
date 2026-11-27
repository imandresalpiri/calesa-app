import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_FASES_DE_LA_CADENA } from '../../entities/flujo/cadena'
import { COLUMNAS_DE_LA_FASE, fasesDesde } from '../../entities/flujo/cadena-filas'
import {
  COLUMNAS_DE_LOS_NUMEROS,
  TOPE_DE_LOS_NUMEROS,
  conteosDesde,
  numerosDe,
  type ConteosDeLaFase,
  type NumerosDeLaFase,
} from '../../entities/flujo/numeros'

// Los números de repuestos del Modo Live: PostgREST bajo la RLS de quien mira (`repuestos.ver`; sin él, cero filas). Las fases del flujo, como la Cadena
// (`infra/flujo/cadena.ts`), y una consulta por fase más «Sin fase», en paralelo, con el mismo filtro e índice que una columna de la Cadena
// (`repuestos_items_fase_id_idx`) y `limit TOPE_DE_LOS_NUMEROS + 1`: el número nunca es el total exacto (`.claude/rules/escala.md`).

async function contarLaFase(faseId: string | null): Promise<Resultado<ConteosDeLaFase>> {
  const supabase = await createClient()
  const consulta = supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_LOS_NUMEROS)
    .is('eliminado_en', null)
    .is('proyecto.eliminado_en', null)
  const { data, error } = await (
    faseId === null ? consulta.is('fase_id', null) : consulta.eq('fase_id', faseId)
  ).limit(TOPE_DE_LOS_NUMEROS + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return conteosDesde(data, TOPE_DE_LOS_NUMEROS)
}

export async function leerNumerosDeRepuestos(): Promise<Resultado<NumerosDeLaFase[]>> {
  const supabase = await createClient()
  // El flujo de repuestos es una sola fila de `flujos` (`ambito = 'repuestos'`).
  const { data, error } = await supabase
    .from('fases')
    .select(`${COLUMNAS_DE_LA_FASE}, flujo:flujos!inner(ambito)`)
    .eq('flujo.ambito', 'repuestos')
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
    .limit(TOPE_DE_FASES_DE_LA_CADENA + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const fases = fasesDesde(data)
  if (!fases.ok) return fases
  const [sinFase, ...lecturas] = await Promise.all([
    contarLaFase(null),
    ...fases.data.map((fase) => contarLaFase(fase.id)),
  ])
  if (!sinFase.ok) return sinFase
  const porFase = new Map<string, ConteosDeLaFase>()
  for (const [i, lectura] of lecturas.entries()) {
    if (!lectura.ok) return lectura
    const fase = fases.data[i]
    if (fase) porFase.set(fase.id, lectura.data)
  }
  return ok(numerosDe(fases.data, { sinFase: sinFase.data, porFase }))
}
