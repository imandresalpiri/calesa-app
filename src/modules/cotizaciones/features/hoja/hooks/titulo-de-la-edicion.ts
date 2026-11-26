import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import type { LoQueFalta } from '../../../entities/obligatorios-al-cotizar'
import {
  limpiarTitulo,
  tituloCambio,
  tituloParaGuardar,
} from '../../../entities/titulo-de-la-cotizacion'
import type { BotonDeGuardar } from '../components/boton-guardar'
import type { TituloDeLaCotizacion } from './use-titulo-de-la-cotizacion'

export type TituloDeLaEdicion = {
  // Lo que se edita difiere de lo guardado: es un cambio que guardar.
  cambio: boolean
  // Sin vehículo y sin título (la base lo rechazaría): falta.
  falta: Extract<LoQueFalta, 'titulo'> | null
  paraGuardar: { titulo: string | null; tituloManual: boolean }
}

// Lo que el título pone en el guardado de una guardada (T307): si cambió, si falta y lo que va en el pedido. Sin el proveedor (una prueba de la hoja), el título
// guardado viaja sin tocar y no se pide. Falta según el vehículo **de la hoja** (el guardado o el elegido para cambiarlo, T315), no el guardado.
export function tituloDeLaEdicion(
  titulo: TituloDeLaCotizacion | null,
  cotizacion: CotizacionDeLaHoja | null,
  vehiculoId: string | null = cotizacion?.vehiculoId ?? null,
): TituloDeLaEdicion {
  if (titulo === null) {
    return {
      cambio: false,
      falta: null,
      paraGuardar: {
        titulo: limpiarTitulo(cotizacion?.titulo),
        tituloManual: cotizacion?.tituloManual ?? false,
      },
    }
  }
  return {
    cambio: tituloCambio(titulo.estado, titulo.inicial),
    falta: cotizacion !== null && vehiculoId === null && titulo.mostrado === null ? 'titulo' : null,
    paraGuardar: tituloParaGuardar(titulo.estado),
  }
}

// «Escribir el título» junto al motivo, si eso es lo que falta y la página dijo en qué panel se escribe.
export function paraElegirElTitulo(
  motivo: string | null,
  falta: TituloDeLaEdicion['falta'],
  edicion: { panelDelTitulo?: string | undefined } | null,
): BotonDeGuardar['paraElegir'] {
  const panel = edicion?.panelDelTitulo
  return motivo !== null && falta !== null && panel !== undefined
    ? { que: falta, eleccion: { panel } }
    : null
}
