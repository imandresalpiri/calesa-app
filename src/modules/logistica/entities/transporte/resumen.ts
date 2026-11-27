// El resumen de la tarjeta «Transporte»: en qué contenedor o embarque va y su estado (calculado por la base), con «Ver el contenedor» o «Ver el embarque» a su
// pantalla, en el origen de la unidad. No tiene aviso propio: «Falta «BL»» llega de «Qué falta». Sin I/O.
import { contenedorDeLogistica, embarqueDeLogistica } from '@/shared/lib/rutas'
import { accionDeVer, type AccionDeLaTarjeta, type ResumenDeTarjeta } from '../nucleo/tarjeta'
import { TEXTO_DEL_ESTADO } from './estado'
import type { EntidadesDeLaUnidad } from './lectura-de-la-unidad'
import { TEXTO_SIN_TRANSPORTE } from './transporte'

export const TEXTO_SIN_CONTENEDOR_NI_EMBARQUE = 'Sin contenedor ni embarque.'

/** De lo que devolvió `transporte_leer` (nulo = sin transporte cargado). */
export function resumenDeTransporte(
  lectura: EntidadesDeLaUnidad | null,
  origenId: string,
): ResumenDeTarjeta {
  const ver = accionDeVer('transporte')
  if (lectura === null) return { lineas: [TEXTO_SIN_TRANSPORTE], aviso: null, acciones: [ver] }
  const { contenedorDeLaUnidad: contenedor, embarque } = lectura
  const lineas: string[] = []
  const acciones: AccionDeLaTarjeta[] = [ver]
  if (contenedor) {
    lineas.push(`Contenedor ${contenedor.numero} · ${TEXTO_DEL_ESTADO[contenedor.estado]}`)
    acciones.push({
      clave: 'contenedor',
      etiqueta: 'Ver el contenedor',
      destino: { tipo: 'ruta', href: contenedorDeLogistica(contenedor.id, origenId) },
    })
  }
  if (embarque) {
    lineas.push(`Embarque ${embarque.booking} · ${TEXTO_DEL_ESTADO[embarque.estado]}`)
    acciones.push({
      clave: 'embarque',
      etiqueta: 'Ver el embarque',
      destino: { tipo: 'ruta', href: embarqueDeLogistica(embarque.id, origenId) },
    })
  }
  return {
    lineas: lineas.length === 0 ? [TEXTO_SIN_CONTENEDOR_NI_EMBARQUE] : lineas,
    aviso: null,
    acciones,
  }
}
