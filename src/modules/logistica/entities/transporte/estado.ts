// El estado de un embarque y de un contenedor (`docs/GLOSARIO.md` › «Estado del embarque»). Lo calcula la base (`embarque_estado()`, `contenedor_estado()`, con el día de la empresa) y
// llega hecho en cada lectura; este espejo de `_estado_del_embarque()` sólo sirve para nombrarlo y para probar la regla de este lado. Nunca se calcula acá lo que se muestra.
export const ESTADOS_DEL_EMBARQUE = ['armandose', 'en_transito', 'llego', 'entregado'] as const
export type EstadoDelEmbarque = (typeof ESTADOS_DEL_EMBARQUE)[number]

// Un contenedor sin embarque no tiene fechas: «Sin embarque».
export const ESTADOS_DEL_CONTENEDOR = [...ESTADOS_DEL_EMBARQUE, 'sin_embarque'] as const
export type EstadoDelContenedor = (typeof ESTADOS_DEL_CONTENEDOR)[number]

export const TEXTO_DEL_ESTADO: Record<EstadoDelContenedor, string> = {
  armandose: 'Armándose',
  en_transito: 'En tránsito',
  llego: 'Llegó',
  entregado: 'Entregado',
  sin_embarque: 'Sin embarque',
}

export type DatosDelEstado = {
  // `AAAA-MM-DD` o nulo.
  zarpeEl: string | null
  arriboEl: string | null
  hayUnidades: boolean
  todasEnFaseFinal: boolean
  // El día de la empresa, `AAAA-MM-DD`: se comparan textos de fecha, nunca `Date`.
  hoy: string
}

/** Entregado (hay unidades y todas en una fase final) manda; si no, llegó (con arribo), en tránsito (zarpó hasta hoy) o armándose. */
export function estadoDelEmbarque(d: DatosDelEstado): EstadoDelEmbarque {
  if (d.hayUnidades && d.todasEnFaseFinal) {
    return 'entregado'
  }
  if (d.arriboEl !== null) {
    return 'llego'
  }
  if (d.zarpeEl !== null && d.zarpeEl <= d.hoy) {
    return 'en_transito'
  }
  return 'armandose'
}

/** El de su embarque, con las fases de sus propias unidades; sin embarque, «Sin embarque». */
export function estadoDelContenedor(
  d: (DatosDelEstado & { conEmbarque: true }) | { conEmbarque: false },
): EstadoDelContenedor {
  return d.conEmbarque ? estadoDelEmbarque(d) : 'sin_embarque'
}
