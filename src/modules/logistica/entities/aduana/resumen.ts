// El resumen de la tarjeta «Aduana»: la declaración viva de la unidad con su canal y, como aviso, el vencimiento de sus tributos si vence en 7 días o ya venció
// (`vencimientoDe`; una pagada no se alarma). «Ver la declaración» lleva a su resumen en `/logistica/aduana`, en el origen de la unidad. Sin I/O.
import { declaracionDeAduana } from '@/shared/lib/rutas'
import { accionDeVer, type ResumenDeTarjeta } from '../nucleo/tarjeta'
import { textoDelCanal, type CanalDeAforo } from './declaracion'
import { vencimientoDe } from './estado'

export const TEXTO_SIN_DECLARACION = 'Sin declaración.'

export type DeclaracionDelResumen = {
  id: string
  numero: string
  canal: CanalDeAforo | null
  venceTributosEl: string | null
}

/** ¿Hace falta saber si está pagada? Sólo si vence en 7 días o ya venció: lejos o sin fecha, no avisa igual. */
export function pideSaberSiEstaPagada(venceTributosEl: string | null, hoy: string): boolean {
  return vencimientoDe(venceTributosEl, hoy, false).tipo !== 'vigente' && venceTributosEl !== null
}

export function resumenDeAduana(pedido: {
  declaracion: DeclaracionDelResumen | null
  // Nulo si no se leyó (no hacía falta o falló): se trata como no pagada, que avisa.
  pagada: boolean | null
  hoy: string
  origenId: string
}): ResumenDeTarjeta {
  const { declaracion } = pedido
  const ver = accionDeVer('aduana')
  if (declaracion === null) return { lineas: [TEXTO_SIN_DECLARACION], aviso: null, acciones: [ver] }
  const vencimiento = vencimientoDe(declaracion.venceTributosEl, pedido.hoy, pedido.pagada ?? false)
  const avisa = vencimiento.tipo === 'vencida' || vencimiento.tipo === 'por-vencer'
  return {
    lineas: [`Declaración ${declaracion.numero} · ${textoDelCanal(declaracion.canal)}`],
    aviso: avisa ? vencimiento.texto : null,
    acciones: [
      ver,
      {
        clave: 'declaracion',
        etiqueta: 'Ver la declaración',
        destino: { tipo: 'ruta', href: declaracionDeAduana(declaracion.id, pedido.origenId) },
      },
    ],
  }
}
