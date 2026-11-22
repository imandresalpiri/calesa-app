// El contenido de las celdas del editor de la tarjeta: poner un contenido (texto, dato, logo o vacío) en lo elegido, escribir el texto de una celda en el lugar y
// vaciar (Supr). Un texto llega a 300 caracteres (code points, como la base) y no lleva «{{» (nada interpola); un texto con datos suma esos 300 entre sus partes de
// texto y lleva hasta 20 partes, y se pone normalizado (`contenidoDeLasPartes()`). Vaciar deja `{tipo: 'vacio'}` y quita entera la celda sin estilo ni combinación: se
// dibuja igual y ahorra bytes. Puro.
import {
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  MAXIMO_DE_PARTES_DE_UN_TEXTO,
  type CeldaDeLaTarjeta,
  type ContenidoDeLaCelda,
  type PlantillaEnCuadricula,
  type TextoConDatos,
  type TextoSimple,
} from '../../cuadricula-de-la-tarjeta'
import { caracteres } from '../../json-de-la-base'
import { caracteresDeLasPartes } from '../../texto-con-datos'
import { idNuevo, idsNuevos } from './ids-nuevos'
import { medido } from './limites'
import { celdaEn, celdasConAnclaEn, dentro, mapaDeLaGrilla, rectEn } from './mapa-de-la-grilla'
import { casillasVacias, celdaNueva, combinada, enPlural, idsDeCeldas, iguales } from './piezas'
import { contenidoDeLasPartes, MOTIVO_DE_LAS_PARTES } from './texto-con-datos'
import { rechazo, type Pos, type Rect, type ResultadoDeEdicion } from './tipos'

export const MOTIVOS_DEL_TEXTO = {
  largo: 'Un texto llega a 300 caracteres.',
  llaves: 'Un texto no lleva «{{».',
  partes: MOTIVO_DE_LAS_PARTES,
} as const

export function motivoDelTexto(texto: string): string | null {
  if (caracteres(texto) > MAXIMO_DE_CARACTERES_DE_UN_TEXTO) return MOTIVOS_DEL_TEXTO.largo
  return texto.includes('{{') ? MOTIVOS_DEL_TEXTO.llaves : null
}

// Lo mismo para un texto o un texto con datos: los 300 caracteres suman sus partes de texto, cada una sin «{{», y van hasta 20 partes.
export function motivoDelContenidoDeTexto(c: TextoSimple | TextoConDatos): string | null {
  if (!('partes' in c)) return motivoDelTexto(c.texto)
  if (caracteresDeLasPartes(c.partes) > MAXIMO_DE_CARACTERES_DE_UN_TEXTO)
    return MOTIVOS_DEL_TEXTO.largo
  if (c.partes.length > MAXIMO_DE_PARTES_DE_UN_TEXTO) return MOTIVOS_DEL_TEXTO.partes
  return c.partes.some((p) => typeof p === 'string' && p.includes('{{'))
    ? MOTIVOS_DEL_TEXTO.llaves
    : null
}

const VACIO: ContenidoDeLaCelda = { tipo: 'vacio' }
const FUERA = 'Esa celda no está en la tarjeta.'

// Vaciar lo elegido: cada celda con ancla en `r` queda vacía, o se quita si no tiene estilo ni combinación.
export function vaciar(p: PlantillaEnCuadricula, r: Rect): ResultadoDeEdicion {
  const mapa = mapaDeLaGrilla(p)
  const enR = new Set(celdasConAnclaEn(mapa, p, r).map((c) => c.indice))
  let cambiadas = 0
  const celdas = p.celdas.flatMap((c, i): CeldaDeLaTarjeta[] => {
    if (!enR.has(i)) return [c]
    if (c.estilo === undefined && !combinada(c)) {
      cambiadas += 1
      return []
    }
    if (c.contenido.tipo === 'vacio') return [c]
    cambiadas += 1
    return [{ ...c, contenido: VACIO }]
  })
  if (cambiadas === 0) return { ok: true, plantilla: p, anuncio: 'No había nada que vaciar.' }
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas },
    anuncio: enPlural(cambiadas, 'Se vació la celda.', 'Se vaciaron N celdas.'),
  })
}

// Poner un contenido en lo elegido: las celdas con ancla en `r` lo toman y cada casilla vacía recibe una celda nueva con él. «Vacío» es vaciar.
export function ponerContenido(
  p: PlantillaEnCuadricula,
  r: Rect,
  pedido: ContenidoDeLaCelda,
): ResultadoDeEdicion {
  if (pedido.tipo === 'vacio') return vaciar(p, r)
  const contenido =
    pedido.tipo === 'texto' && 'partes' in pedido ? contenidoDeLasPartes(pedido.partes) : pedido
  const motivo = contenido.tipo === 'texto' ? motivoDelContenidoDeTexto(contenido) : null
  if (motivo !== null) return rechazo(motivo)
  const mapa = mapaDeLaGrilla(p)
  const enR = new Set(celdasConAnclaEn(mapa, p, r).map((c) => c.indice))
  let cambiadas = 0
  const celdas = p.celdas.map((c, i) => {
    if (!enR.has(i) || iguales(c.contenido, contenido)) return c
    cambiadas += 1
    return { ...c, contenido }
  })
  const vacias = casillasVacias(mapa, r)
  const nuevas = idsNuevos('c', idsDeCeldas(p), vacias.length).map((id, j) =>
    celdaNueva(p, id, vacias[j] ?? { f: 0, k: 0 }, { contenido }),
  )
  const n = cambiadas + nuevas.length
  if (n === 0) return { ok: true, plantilla: p, anuncio: 'El contenido ya era ese.' }
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas: [...celdas, ...nuevas] },
    anuncio: enPlural(
      enR.size + nuevas.length,
      'Se cambió el contenido de la celda.',
      'Se cambió el contenido de N celdas.',
    ),
  })
}

// Escribir el texto de una celda (Enter o F2 en el lugar): la celda de esa casilla, o una nueva, pasa a ser un texto. Un texto vacío la vacía.
export function escribirTexto(
  p: PlantillaEnCuadricula,
  pos: Pos,
  texto: string,
): ResultadoDeEdicion {
  const mapa = mapaDeLaGrilla(p)
  if (!dentro(mapa, pos)) return rechazo(FUERA)
  if (texto === '') return vaciar(p, rectEn(mapa, p, pos))
  const motivo = motivoDelTexto(texto)
  if (motivo !== null) return rechazo(motivo)
  const contenido: ContenidoDeLaCelda = { tipo: 'texto', texto }
  const ubicada = celdaEn(mapa, p, pos)
  if (ubicada !== null && iguales(ubicada.celda.contenido, contenido))
    return { ok: true, plantilla: p, anuncio: 'El texto ya era ese.' }
  const celdas =
    ubicada === null
      ? [...p.celdas, celdaNueva(p, idNuevo('c', idsDeCeldas(p)), pos, { contenido })]
      : p.celdas.map((c, i) => (i === ubicada.indice ? { ...c, contenido } : c))
  return medido(p, { ok: true, plantilla: { ...p, celdas }, anuncio: 'Se escribió en la celda.' })
}
