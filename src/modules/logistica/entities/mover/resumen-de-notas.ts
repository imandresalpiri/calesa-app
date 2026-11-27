// Los resúmenes de las tarjetas «Notas» e «Historial» (área `mover`): la última nota (quién, cuándo y su texto) y el último cambio de fase. El del historial sale de
// las pasadas que ya leyó la cadena, sin otra consulta. «Escribir una nota» es la acción principal: abre el drawer con el campo enfocado. Sin I/O.
import { fechaRelativa } from '@/shared/lib/fechas'
import { accionDeVer, type AccionDeLaTarjeta, type ResumenDeTarjeta } from '../nucleo/tarjeta'
import type { PasadaLeida } from './cadena'
import { lineaDelCambio } from './historial'

/** El campo de la nota nueva lleva este atributo: «Escribir una nota» lo enfoca al abrir el drawer. */
export const ATRIBUTO_DE_NOTA_NUEVA = 'data-nota-nueva'

export const ACCION_ESCRIBIR_NOTA: AccionDeLaTarjeta = {
  clave: 'escribir',
  etiqueta: 'Escribir una nota',
  destino: { tipo: 'drawer', enfocar: `[${ATRIBUTO_DE_NOTA_NUEVA}]` },
}

export const TEXTO_SIN_NOTAS = 'Sin notas todavía.'
export const TEXTO_SIN_CAMBIOS = 'Todavía no cambió de fase.'

export type UltimaNota = { cuerpo: string; autor: string | null; creadoEn: string }

export function resumenDeNotas(pedido: {
  nota: UltimaNota | null
  puedeEscribir: boolean
  ahora?: Date
}): ResumenDeTarjeta {
  const acciones = [...(pedido.puedeEscribir ? [ACCION_ESCRIBIR_NOTA] : []), accionDeVer('notas')]
  const { nota } = pedido
  if (nota === null) return { lineas: [TEXTO_SIN_NOTAS], aviso: null, acciones }
  const cuando = fechaRelativa(nota.creadoEn, { ahora: pedido.ahora })
  return {
    lineas: [`${nota.autor ?? 'Otra persona'}, ${cuando}`, nota.cuerpo],
    aviso: null,
    acciones,
  }
}

/** De las pasadas leídas (la más reciente primero): el último cambio y cuándo. Nulas = no se pudieron leer. */
export function resumenDelHistorial(
  pasadas: readonly PasadaLeida[] | null,
  ahora?: Date,
): ResumenDeTarjeta {
  const acciones = [accionDeVer('historial')]
  const [ultima, anterior] = pasadas ?? []
  if (pasadas === null)
    return { lineas: ['No pudimos leer las fases pasadas.'], aviso: null, acciones }
  if (ultima === undefined) return { lineas: [TEXTO_SIN_CAMBIOS], aviso: null, acciones }
  const linea = lineaDelCambio({ de: anterior?.nombre ?? null, a: ultima.nombre })
  const quien = ultima.quien ?? (ultima.quienId === null ? 'Sistema' : 'Otra persona')
  return {
    lineas: [linea, `${quien}, ${fechaRelativa(ultima.entro, { ahora })}`],
    aviso: null,
    acciones,
  }
}
