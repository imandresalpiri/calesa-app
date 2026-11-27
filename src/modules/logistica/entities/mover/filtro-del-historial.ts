// El filtro del historial de la unidad (la tarjeta «Historial» de su página): por la fase a la que entró (`?historial_fase=<id>`) y por quién lo movió
// (`?historial_quien=<id>` o `sistema`, un cambio sin persona). Se filtra en la base, con sus índices (`historial_fases_vehiculo_fase_idx`,
// `historial_fases_vehiculo_quien_idx`). Las opciones salen de las pasadas que ya leyó la cadena: no hay otra lectura. Sin I/O.
import { z } from 'zod'
import type { PasadaLeida } from './cadena'

export const CLAVE_DEL_FILTRO_DE_FASE = 'historial_fase'
export const CLAVE_DEL_FILTRO_DE_QUIEN = 'historial_quien'
export const QUIEN_ES_EL_SISTEMA = 'sistema'

export type FiltroDelHistorial = {
  // La fase a la que entró; nula = todas.
  fase: string | null
  // El id de quien lo movió, `sistema` (sin persona) o nulo = todos.
  quien: string | null
}

export const SIN_FILTRO: FiltroDelHistorial = { fase: null, quien: null }

const id = z.guid()

/** Lo que llega de la URL, validado: un valor que no es un id (ni `sistema`, para quién) se descarta. */
export function filtroDesdeLaUrl(url: {
  fase: string | null | undefined
  quien: string | null | undefined
}): FiltroDelHistorial {
  const fase = id.safeParse(url.fase)
  const quien = url.quien === QUIEN_ES_EL_SISTEMA ? url.quien : id.safeParse(url.quien).data
  return { fase: fase.success ? fase.data : null, quien: quien ?? null }
}

export const hayFiltro = (filtro: FiltroDelHistorial) =>
  filtro.fase !== null || filtro.quien !== null

export type OpcionDelFiltro = { valor: string; etiqueta: string }

function unicas(opciones: OpcionDelFiltro[]): OpcionDelFiltro[] {
  const vistas = new Map<string, OpcionDelFiltro>()
  for (const o of opciones) if (!vistas.has(o.valor)) vistas.set(o.valor, o)
  return [...vistas.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
}

/** Las fases y las personas que aparecen en las pasadas leídas, sin repetir y por nombre; «Sistema» si hubo un cambio sin persona. */
export function opcionesDelFiltro(pasadas: readonly PasadaLeida[]): {
  fases: OpcionDelFiltro[]
  quienes: OpcionDelFiltro[]
} {
  return {
    fases: unicas(pasadas.map((p) => ({ valor: p.aFaseId, etiqueta: p.nombre }))),
    quienes: unicas(
      pasadas.map((p) =>
        p.quienId === null
          ? { valor: QUIEN_ES_EL_SISTEMA, etiqueta: 'Sistema' }
          : { valor: p.quienId, etiqueta: p.quien ?? 'Sin nombre' },
      ),
    ),
  }
}
