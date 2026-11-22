// El estado de la edición (docs/GLOSARIO.md › «Estado de la edición»): lo que la barra de la fórmula dice de la pieza que se edita en Planilla, Hoja o
// Tarjeta. Del núcleo de cotizaciones: cada área arma el suyo (`entities/{formula,diseno,plantilla}/estado-de-la-edicion.ts`) y la barra lo dibuja.

// Lo que dice el estado de la pieza que se edita: lo no guardado manda sobre lo demás. `detalle` (quién y cuándo) acompaña al estado en pantallas
// anchas. Una pieza sin borrador (el flujo se guarda en el acto) no dice estado: `null`.
export type EstadoDeLaEdicion =
  | { tipo: 'cambios' }
  | { tipo: 'borrador'; detalle?: string }
  // Sin `version` (la lectura de la pieza no la trae): «Publicada».
  | { tipo: 'publicada'; version?: number; detalle?: string }
  | null

export function textoDelEstado(estado: NonNullable<EstadoDeLaEdicion>): string {
  switch (estado.tipo) {
    case 'cambios':
      return 'Cambios sin guardar'
    case 'borrador':
      return 'Borrador'
    case 'publicada':
      return estado.version === undefined ? 'Publicada' : `Publicada v${String(estado.version)}`
  }
}

export type TonoDelEstado = 'aviso' | 'neutro' | 'exito'

export function tonoDelEstado(estado: NonNullable<EstadoDeLaEdicion>): TonoDelEstado {
  switch (estado.tipo) {
    case 'cambios':
      return 'aviso'
    case 'borrador':
      return 'neutro'
    case 'publicada':
      return 'exito'
  }
}

// El estado de una pieza con borrador, desde lo que la lectura sabe: lo no guardado manda; después, el borrador; después, la publicada (sin ninguna, nada).
export function estadoDeUnaPieza(lectura: {
  hayCambios: boolean
  borrador: { detalle?: string } | null
  publicada: { version?: number; detalle?: string } | null
}): EstadoDeLaEdicion {
  if (lectura.hayCambios) {
    return { tipo: 'cambios' }
  }
  if (lectura.borrador) {
    return lectura.borrador.detalle === undefined
      ? { tipo: 'borrador' }
      : { tipo: 'borrador', detalle: lectura.borrador.detalle }
  }
  if (lectura.publicada) {
    const { version, detalle } = lectura.publicada
    return {
      tipo: 'publicada',
      ...(version === undefined ? {} : { version }),
      ...(detalle === undefined ? {} : { detalle }),
    }
  }
  return null
}
