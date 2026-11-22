import { estadoDeUnaPieza, type EstadoDeLaEdicion } from '../estado-de-la-edicion'

// El estado de la tarjeta de un origen para la barra de la fórmula: lo no guardado manda; después el borrador (`esperada`, su hora de guardado, no
// nulo si lo hay) y, sin él, la publicada con su versión.
export function estadoDeLaTarjeta(args: {
  hayCambios: boolean
  esperada: string | null
  publicada: { version: number | null } | null
}): EstadoDeLaEdicion {
  return estadoDeUnaPieza({
    hayCambios: args.hayCambios,
    borrador: args.esperada === null ? null : {},
    publicada: args.publicada
      ? args.publicada.version === null
        ? {}
        : { version: args.publicada.version }
      : null,
  })
}
