// El filtro viejo «Situación» (`?situacion=`: las situaciones propias, las fases y «Sin fase» en una sola lista) se partió en «Subasta» y «Fase». Una vista
// guardada se lee traducida: su enlace y «la vista actual» usan las claves nuevas. Sin I/O.
//   en_subasta → subasta=vivas · sin_resolver → subasta=sin_resolver · no_ganada → subasta=no_ganadas · las fases y `ninguna` → fase=
// «Subasta» es una a la vez: si venían varias propias gana la primera en su orden (vivas › sin resolver › no ganadas). Un `subasta` o un `fase` que ya esté se
// respeta. Se quita también el cursor: era de otro filtro.
import { z } from 'zod'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { FILTRO_FASE, SIN_FASE } from './filtros'
import { FILTRO_SUBASTA, type ValorDeSubasta } from './filtros-de-subasta'
import { SITUACIONES_PROPIAS, type SituacionPropia } from './situacion'

export const CLAVE_VIEJA_DE_SITUACION = 'situacion'

const SUBASTA_DE_LA_PROPIA: Record<SituacionPropia, ValorDeSubasta> = {
  en_subasta: 'vivas',
  sin_resolver: 'sin_resolver',
  no_ganada: 'no_ganadas',
}

const esFase = (valor: string) => valor === SIN_FASE || z.guid().safeParse(valor).success

// Lo que dice el valor viejo en las claves nuevas (cada una, si tiene algo).
function traduccion(vieja: string): { subasta?: string; fase?: string } {
  const valores = vieja.split(',')
  const propia = SITUACIONES_PROPIAS.find((situacion) => valores.includes(situacion))
  const fases = [...new Set(valores.filter(esFase))]
  return {
    ...(propia ? { subasta: SUBASTA_DE_LA_PROPIA[propia] } : {}),
    ...(fases.length > 0 ? { fase: fases.join(',') } : {}),
  }
}

/** Una vista guardada con `situacion`, leída con las claves nuevas (la misma vista si no la tiene). */
export function conSituacionTraducida<
  V extends { params: Readonly<Record<string, string | undefined>> },
>(vista: V): V {
  const { [CLAVE_VIEJA_DE_SITUACION]: vieja, [CLAVE_DE_CURSOR]: _cursor, ...resto } = vista.params
  if (vieja === undefined) return vista
  const nuevas = traduccion(vieja)
  return {
    ...vista,
    params: {
      ...resto,
      ...(nuevas.subasta !== undefined && resto[FILTRO_SUBASTA] === undefined
        ? { [FILTRO_SUBASTA]: nuevas.subasta }
        : {}),
      ...(nuevas.fase !== undefined && resto[FILTRO_FASE] === undefined
        ? { [FILTRO_FASE]: nuevas.fase }
        : {}),
    },
  }
}
