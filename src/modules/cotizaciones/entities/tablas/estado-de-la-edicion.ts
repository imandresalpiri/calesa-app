import { estadoDeUnaPieza, type EstadoDeLaEdicion } from '../estado-de-la-edicion'

// El estado de una tabla de referencia para la barra de la fórmula: lo no publicado (las filas cambiadas, que viven en la pestaña) manda; si no, la
// versión publicada con quién la publicó. Una tabla no tiene borrador guardado: sus cambios son «Cambios sin guardar» hasta que se publican.
export function estadoDeLaTabla(args: {
  cambios: boolean
  version: number
  publicadoPor: string | null
}): EstadoDeLaEdicion {
  return estadoDeUnaPieza({
    hayCambios: args.cambios,
    borrador: null,
    publicada: {
      version: args.version,
      ...(args.publicadoPor === null ? {} : { detalle: args.publicadoPor }),
    },
  })
}
