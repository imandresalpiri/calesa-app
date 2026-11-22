// Copiar y pegar en el editor de la tarjeta: Ctrl/Cmd+C guarda en memoria un bloque rectangular con el contenido, el estilo y las combinaciones de lo elegido, y al
// portapapeles del sistema va su texto en TSV (el de las celdas de texto). Ctrl/Cmd+V pega el bloque desde la celda activa: si no cabe o corta una combinación, dice
// por qué. Sin bloque, el texto plano del sistema se pega como texto en la celda activa. Puro.
import type {
  CeldaDeLaTarjeta,
  ContenidoDeLaCelda,
  EstiloDeLaCelda,
  PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { textoDeLasPartes } from '../../texto-con-datos'
import { MOTIVO_DE_LA_COMBINACION_CORTADA } from './combinar'
import { escribirTexto, motivoDelTexto } from './contenido'
import { idsNuevos } from './ids-nuevos'
import { medido } from './limites'
import {
  celdasConAnclaEn,
  combinacionesCortadas,
  dentro,
  mapaDeLaGrilla,
} from './mapa-de-la-grilla'
import { celdaNueva, conAbarca, enPlural, idsDeCeldas } from './piezas'
import { rechazo, type Pos, type Rect, type ResultadoDeEdicion } from './tipos'

export type CeldaDelBloque = {
  readonly df: number
  readonly dk: number
  readonly abarca_filas?: number
  readonly abarca_columnas?: number
  readonly contenido: ContenidoDeLaCelda
  readonly estilo?: EstiloDeLaCelda
}

export type Bloque = {
  readonly filas: number
  readonly columnas: number
  readonly celdas: readonly CeldaDelBloque[]
}

export function copiar(p: PlantillaEnCuadricula, r: Rect): Bloque {
  const mapa = mapaDeLaGrilla(p)
  return {
    filas: r.f1 - r.f0 + 1,
    columnas: r.k1 - r.k0 + 1,
    celdas: celdasConAnclaEn(mapa, p, r).map(({ celda, rect }) => ({
      df: rect.f0 - r.f0,
      dk: rect.k0 - r.k0,
      ...(celda.abarca_filas === undefined ? {} : { abarca_filas: celda.abarca_filas }),
      ...(celda.abarca_columnas === undefined ? {} : { abarca_columnas: celda.abarca_columnas }),
      contenido: celda.contenido,
      ...(celda.estilo === undefined ? {} : { estilo: celda.estilo }),
    })),
  }
}

// «No cabe: falta 1 fila.», «No cabe: faltan 2 columnas.», «No cabe: faltan 2 filas y 1 columna.»
function motivoDeNoCabe(filas: number, columnas: number): string {
  const partes = [
    ...(filas > 0 ? [filas === 1 ? '1 fila' : `${String(filas)} filas`] : []),
    ...(columnas > 0 ? [columnas === 1 ? '1 columna' : `${String(columnas)} columnas`] : []),
  ]
  const verbo = partes.length === 1 && filas + columnas === 1 ? 'falta' : 'faltan'
  return `No cabe: ${verbo} ${partes.join(' y ')}.`
}

export function pegar(p: PlantillaEnCuadricula, pos: Pos, b: Bloque): ResultadoDeEdicion {
  const mapa = mapaDeLaGrilla(p)
  if (!dentro(mapa, pos)) return rechazo('Esa celda no está en la tarjeta.')
  const faltanFilas = pos.f + b.filas - mapa.filas
  const faltanColumnas = pos.k + b.columnas - mapa.columnas
  if (faltanFilas > 0 || faltanColumnas > 0)
    return rechazo(motivoDeNoCabe(Math.max(0, faltanFilas), Math.max(0, faltanColumnas)))
  const destino: Rect = {
    f0: pos.f,
    k0: pos.k,
    f1: pos.f + b.filas - 1,
    k1: pos.k + b.columnas - 1,
  }
  if (combinacionesCortadas(mapa, p, destino).length > 0)
    return rechazo(MOTIVO_DE_LA_COMBINACION_CORTADA)
  const pisadas = new Set(celdasConAnclaEn(mapa, p, destino).map((c) => c.indice))
  const quedan = p.celdas.filter((_, i) => !pisadas.has(i))
  const ids = idsNuevos('c', idsDeCeldas(p), b.celdas.length)
  const pegadas = b.celdas.map((c, j): CeldaDeLaTarjeta => {
    const nueva = celdaNueva(
      p,
      ids[j] ?? '',
      { f: pos.f + c.df, k: pos.k + c.dk },
      { contenido: c.contenido, estilo: c.estilo },
    )
    return conAbarca(nueva, c.abarca_filas ?? 1, c.abarca_columnas ?? 1)
  })
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas: [...quedan, ...pegadas] },
    anuncio:
      b.celdas.length === 0
        ? 'Se pegó un rango vacío.'
        : enPlural(b.celdas.length, 'Se pegó una celda.', 'Se pegaron N celdas.'),
    seleccion: { tipo: 'celdas', ancla: pos, foco: { f: destino.f1, k: destino.k1 } },
  })
}

// El texto del bloque en TSV para el portapapeles del sistema: el de las celdas de texto (sin tabuladores ni saltos adentro; de un texto con datos, sólo sus partes
// de texto), vacío lo demás.
export function textoDelBloque(b: Bloque): string {
  const filas = Array.from({ length: b.filas }, () => new Array<string>(b.columnas).fill(''))
  for (const c of b.celdas) {
    const fila = filas[c.df]
    if (fila === undefined || c.contenido.tipo !== 'texto' || c.dk >= b.columnas) continue
    const texto = 'partes' in c.contenido ? textoDeLasPartes(c.contenido.partes) : c.contenido.texto
    fila[c.dk] = texto.replace(/[\t\r\n]+/g, ' ')
  }
  return filas.map((f) => f.join('\t')).join('\n')
}

// El texto plano del sistema como texto de la celda activa (sin un salto de línea final).
export function pegarTexto(p: PlantillaEnCuadricula, pos: Pos, texto: string): ResultadoDeEdicion {
  const limpio = texto.replace(/\r\n?/g, '\n').replace(/\n$/, '')
  const motivo = motivoDelTexto(limpio)
  if (motivo !== null) return rechazo(motivo)
  const resultado = escribirTexto(p, pos, limpio)
  return resultado.ok ? { ...resultado, anuncio: 'Se pegó el texto.' } : resultado
}
