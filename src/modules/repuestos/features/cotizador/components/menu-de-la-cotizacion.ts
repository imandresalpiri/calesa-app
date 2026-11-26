import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  accionesDeLaTarjeta,
  type ClaveDeAccionDeTarjeta,
} from '../../../entities/cotizador/acciones-de-la-tarjeta'

type Entrada = Parameters<typeof accionesDeLaTarjeta>[0]

// El «⋯» de la tarjeta de una cotización: las líneas que da la entidad (`accionesDeLaTarjeta`), en su orden; una apagada lleva debajo su motivo. Las que abren
// algo encima («Aceptar», «Anular» y «Abrir», que navega) esperan a que el menú termine de cerrarse. «Anular» es la destructiva.
export function menuDeLaCotizacion(
  entrada: Entrada,
  elegir: (clave: ClaveDeAccionDeTarjeta) => void,
): AccionDeMenu[] {
  return accionesDeLaTarjeta(entrada).flatMap((a): AccionDeMenu[] => {
    const linea: AccionDeMenu = {
      tipo: 'accion',
      clave: a.clave,
      etiqueta: a.etiqueta,
      deshabilitada: a.motivo !== null,
      destructiva: a.clave === 'anular',
      despuesDeCerrar: true,
      alElegir: () => {
        elegir(a.clave)
      },
    }
    return a.motivo === null
      ? [linea]
      : [linea, { tipo: 'nota', clave: `${a.clave}-motivo`, texto: a.motivo }]
  })
}
