// Lo que muestra una celda de la tarjeta, resuelto en texto: un texto literal por renglones, un texto con datos (sus partes resueltas en un solo texto, y por
// tramos si lleva un monto), un dato (`valor-del-dato.ts`), el logo, la foto del asesor (quien mira) o nada. Una lista de respaldo o unas condiciones se resuelven
// antes con la cotización (`condiciones-de-la-celda.ts`).
import type { ParteDelTexto } from '../cuadricula-de-la-tarjeta'
import type { ContenidoResuelto } from './condiciones-de-la-celda'
import { inicialesDe } from './contexto-de-la-cotizacion'
import {
  datoDibujado,
  parteDibujada,
  textoDibujado,
  type ContenidoDibujado,
  type EntradaDelContenido,
  type TramoDelTexto,
} from './valor-del-dato'

export {
  aplica,
  esElTotal,
  SIN_DATO,
  valorDelNodo,
  type ContenidoDibujado,
  type EntradaDelContenido,
  type MontoDibujado,
  type TramoDelTexto,
} from './valor-del-dato'

// Los tramos, planos: los textos seguidos, juntos, y sin textos vacíos.
function juntarTramos(tramos: readonly TramoDelTexto[]): TramoDelTexto[] {
  const salida: TramoDelTexto[] = []
  for (const t of tramos) {
    if (t === '') continue
    const ultimo = salida.at(-1)
    if (typeof t === 'string' && typeof ultimo === 'string') salida[salida.length - 1] = ultimo + t
    else salida.push(t)
  }
  return salida
}

// Un texto con datos resuelto: `lineas`, el texto entero (los montos con su cifra); `tramos`, sólo si lleva un monto.
export function textoConDatosDibujado(
  e: EntradaDelContenido,
  partes: readonly ParteDelTexto[],
): Extract<ContenidoDibujado, { tipo: 'texto' }> {
  const tramos = juntarTramos(partes.map((p) => (typeof p === 'string' ? p : parteDibujada(e, p))))
  const texto = tramos.map((t) => (typeof t === 'string' ? t : t.texto)).join('')
  const lineas = texto === '' ? [] : texto.split('\n')
  return tramos.some((t) => typeof t !== 'string')
    ? { tipo: 'texto', lineas, tramos }
    : { tipo: 'texto', lineas }
}

// Recibe la celda ya resuelta (`resolverElContenido()`): la geometría la resuelve una vez y la usa también para su marca.
export function contenidoDibujado(e: EntradaDelContenido, c: ContenidoResuelto): ContenidoDibujado {
  switch (c.tipo) {
    case 'texto':
      return 'partes' in c ? textoConDatosDibujado(e, c.partes) : textoDibujado(c.texto)
    case 'vacio':
      return { tipo: 'vacio' }
    case 'logo':
      return e.contexto.logo === null ? { tipo: 'vacio' } : { tipo: 'logo' }
    case 'foto_del_asesor': {
      const asesor = e.contexto.asesor
      return asesor === null
        ? { tipo: 'vacio' }
        : {
            tipo: 'foto_del_asesor',
            url: asesor.foto,
            iniciales: inicialesDe(asesor.nombre),
            nombre: asesor.nombre,
          }
    }
    case 'dato':
      return datoDibujado(e, c)
  }
}
