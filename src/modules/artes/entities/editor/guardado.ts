// El estado del guardado del editor de artes, el renglón de la barra: qué se dice según si hay un envío en vuelo, cómo terminó el último y si
// lo que se ve difiere de lo guardado. Un fallo queda hasta que un guardado sale bien. Puro.

export type FalloDelGuardado = 'sin-conexion' | 'conflicto' | 'error'

export type EstadoDelGuardado = 'guardado' | 'cambios' | 'guardando' | FalloDelGuardado

export const MENSAJE_DEL_CONFLICTO_DE_ARTE = 'Otra persona guardó esta plantilla.'

// En un conflicto el renglón dice lo que pasa con lo de quien edita; el porqué va en el aviso encima del lienzo.
export const TEXTOS_DEL_GUARDADO: Readonly<Record<EstadoDelGuardado, string>> = {
  guardado: 'Guardado',
  cambios: 'Cambios sin guardar',
  guardando: 'Guardando…',
  'sin-conexion': 'Sin conexión: se guarda cuando vuelva.',
  conflicto: 'Cambios sin guardar',
  error: 'No se pudo guardar.',
}

export function estadoDelGuardado({
  enCurso,
  fallo,
  hayCambios,
}: {
  enCurso: boolean
  fallo: FalloDelGuardado | null
  hayCambios: boolean
}): EstadoDelGuardado {
  if (enCurso) {
    return 'guardando'
  }
  if (fallo !== null) {
    return fallo
  }
  return hayCambios ? 'cambios' : 'guardado'
}
