// Lo que el inspector del editor de artes («Diseño») lee de lo elegido y cómo arma cada cambio: qué se eligió (nada, una capa, un grupo
// entero o varias), cuántas unidades se alinean, el valor común de varias capas («Mixto» si difieren), los topes de cada campo, el tamaño de
// una caja (sin tocar el tamaño de la letra de un texto), el borde, la sombra y el fondo. Puro.
import {
  INTERLINEADO_MAXIMO,
  INTERLINEADO_MINIMO,
  LADOS_MAXIMOS,
  LADOS_MINIMOS,
  type CapaDeArte,
  type FondoDeArte,
  type PaginaDeArte,
  type SombraDeCapa,
} from '../documento'
import type { Medidas } from '../formatos'
import { cajaDe, union, type Caja } from './cajas'
import { COLOR_DE_LA_FORMA_NUEVA } from './capas-nuevas'
import { estaBloqueada } from './grupos'
import { escalarNodos } from './pluma'

export type LoElegido =
  | { tipo: 'nada' }
  | { tipo: 'capa'; capa: CapaDeArte; bloqueada: boolean }
  | { tipo: 'grupo'; capas: CapaDeArte[]; caja: Caja; bloqueada: boolean }
  | { tipo: 'varias'; capas: CapaDeArte[] }

// Un grupo está elegido entero si lo elegido son exactamente sus miembros.
function esElGrupoEntero(
  pagina: PaginaDeArte,
  elegidas: ReadonlySet<string>,
  grupo: string | null,
) {
  return grupo !== null && pagina.capas.every((c) => (c.grupoId === grupo) === elegidas.has(c.id))
}

export function loElegido(pagina: PaginaDeArte, seleccion: readonly string[]): LoElegido {
  const elegidas = new Set(seleccion)
  const capas = pagina.capas.filter((c) => elegidas.has(c.id))
  const [primera] = capas
  if (!primera) {
    return { tipo: 'nada' }
  }
  if (capas.length === 1) {
    return { tipo: 'capa', capa: primera, bloqueada: estaBloqueada(pagina, primera) }
  }
  const caja = union(capas.map(cajaDe))
  if (caja && esElGrupoEntero(pagina, elegidas, primera.grupoId)) {
    const bloqueada = capas.some((c) => estaBloqueada(pagina, c))
    return { tipo: 'grupo', capas, caja, bloqueada }
  }
  return { tipo: 'varias', capas }
}

// Cuántas unidades mueven «Alinear» y «Distribuir» (las mismas que arma el reducer): un grupo con todos sus miembros elegidos cuenta como una,
// cada capa suelta como una, y lo bloqueado no cuenta. Con una se alinea contra el documento; para distribuir hacen falta tres.
export function unidadesQueSeMueven(pagina: PaginaDeArte, seleccion: readonly string[]): number {
  const elegidas = new Set(seleccion)
  const claves = new Set<string>()
  for (const capa of pagina.capas) {
    if (!elegidas.has(capa.id) || estaBloqueada(pagina, capa)) {
      continue
    }
    const grupo = capa.grupoId
    const entero =
      grupo !== null && pagina.capas.every((c) => c.grupoId !== grupo || elegidas.has(c.id))
    claves.add(entero ? `grupo:${grupo}` : capa.id)
  }
  return claves.size
}

export const UNIDADES_PARA_DISTRIBUIR = 3

export type ValorComun<T> = { mixto: false; valor: T } | { mixto: true }

// El valor que comparten todas las capas; si alguna difiere (o no hay ninguna), mixto.
export function valorComun<T>(
  capas: readonly CapaDeArte[],
  leer: (capa: CapaDeArte) => T,
): ValorComun<T> {
  const [primera, ...resto] = capas
  if (!primera) {
    return { mixto: true }
  }
  const valor = leer(primera)
  return resto.every((c) => Object.is(leer(c), valor)) ? { mixto: false, valor } : { mixto: true }
}

export type Limites = { minimo: number; maximo: number }

// Lo que admite cada campo del inspector: la opacidad se escribe en por ciento; un lado (ancho, alto, grosor, radio) no es negativo.
export const LIMITES_DEL_INSPECTOR = {
  opacidad: { minimo: 0, maximo: 100 },
  coordenada: { minimo: -100_000, maximo: 100_000 },
  lado: { minimo: 0, maximo: 100_000 },
  tamano: { minimo: 1, maximo: 2000 },
  interlineado: { minimo: INTERLINEADO_MINIMO, maximo: INTERLINEADO_MAXIMO },
  lados: { minimo: LADOS_MINIMOS, maximo: LADOS_MAXIMOS },
  desenfoque: { minimo: 0, maximo: 500 },
  angulo: { minimo: 0, maximo: 360 },
} as const satisfies Record<string, Limites>

export function acotar(valor: number, { minimo, maximo }: Limites): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

// A lo más `decimales` decimales (lo que muestra un campo; lo guardado no se toca).
export function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

// ↑ o ↓ en un campo numérico: de a un paso, de a diez con Mayús; sin los restos de la coma flotante (1,2 + 0,1 da 1,3).
export function conFlecha(valor: number, sentido: 1 | -1, grande: boolean, paso = 1): number {
  return redondear(valor + sentido * paso * (grande ? 10 : 1), 6)
}

// La rotación en (-180, 180]: 270 se escribe -90.
export function normalizarGrados(grados: number): number {
  const vuelta = ((grados % 360) + 360) % 360
  return vuelta > 180 ? vuelta - 360 : vuelta
}

// La caja con otro ancho o alto, desde su esquina: lo que una línea o un trazo dibujan por dentro escala con ella. Un texto conserva su alto
// (lo mide el lienzo) y el tamaño de su letra (sólo lo cambia su campo).
export function conMedidas(capa: CapaDeArte, medidas: Partial<Medidas>): CapaDeArte {
  const ancho = medidas.ancho ?? capa.ancho
  const alto = capa.tipo === 'texto' ? capa.alto : (medidas.alto ?? capa.alto)
  const sx = capa.ancho > 0 ? ancho / capa.ancho : 1
  const sy = capa.alto > 0 ? alto / capa.alto : 1
  if (capa.tipo === 'linea') {
    const [a, b] = capa.puntos
    return {
      ...capa,
      ancho,
      alto,
      puntos: [
        { x: a.x * sx, y: a.y * sy },
        { x: b.x * sx, y: b.y * sy },
      ],
    }
  }
  if (capa.tipo === 'trazo') {
    return { ...capa, ancho, alto, nodos: escalarNodos(capa.nodos, sx, sy) }
  }
  return { ...capa, ancho, alto }
}

export const GROSOR_AL_PONER_BORDE = 2
// El color con que nace un borde o un contorno al encenderlo, y un relleno (el de una forma nueva).
export const COLOR_DEL_BORDE_NUEVO = '#18181b'
export const COLOR_DEL_RELLENO_NUEVO = COLOR_DE_LA_FORMA_NUEVA

// Pone o quita el borde (en un texto, el contorno). Al ponerlo sin grosor, lleva uno que se vea; la línea siempre tiene el suyo.
export function conBorde(capa: CapaDeArte, borde: string | null): CapaDeArte {
  if (capa.tipo === 'linea') {
    return borde === null ? capa : { ...capa, borde }
  }
  const grosor = borde !== null && capa.grosor === 0 ? GROSOR_AL_PONER_BORDE : capa.grosor
  return { ...capa, borde, grosor }
}

export const SOMBRA_NUEVA: SombraDeCapa = { color: '#00000040', desenfoque: 16, x: 0, y: 4 }

// Cambia una parte de la sombra; sin sombra, nada.
export function conSombra(capa: CapaDeArte, parte: Partial<SombraDeCapa>): CapaDeArte {
  return capa.sombra ? { ...capa, sombra: { ...capa.sombra, ...parte } } : capa
}

export const ANGULO_DEL_DEGRADADO_NUEVO = 180

// El fondo del otro tipo: el degradado nace del color que había (hacia blanco, o hacia negro si era blanco) y el color sale de su comienzo.
export function fondoDeTipo(fondo: FondoDeArte, tipo: FondoDeArte['tipo']): FondoDeArte {
  if (fondo.tipo === tipo) {
    return fondo
  }
  if (fondo.tipo === 'degradado') {
    return { tipo: 'color', color: fondo.desde }
  }
  const hasta = fondo.color.toLowerCase().startsWith('#ffffff') ? '#000000' : '#ffffff'
  return { tipo: 'degradado', desde: fondo.color, hasta, angulo: ANGULO_DEL_DEGRADADO_NUEVO }
}

// La clave con que el historial junta en un solo paso los cambios seguidos de un campo sobre las mismas capas.
export function claveDeFusion(campo: string, ids: readonly string[]): string {
  return `inspector:${campo}:${ids.join(',')}`
}

const HEXADECIMAL = /^#?([0-9a-f]{6}([0-9a-f]{2})?)$/i

// Lo tipeado en el campo de color: `#rrggbb` (o con su alfa, `#rrggbbaa`), con o sin `#`, en minúsculas; si no es un color, nulo.
export function leerColorTipeado(texto: string): string | null {
  const leido = HEXADECIMAL.exec(texto.trim())
  return leido?.[1] ? `#${leido[1].toLowerCase()}` : null
}

// El color que elige el selector del navegador (`#rrggbb`), con el alfa que ya tenía el de la capa.
export function conElAlfaDe(elegido: string, anterior: string | null): string {
  const alfa = anterior && anterior.length === 9 ? anterior.slice(7) : ''
  return `${elegido.slice(0, 7).toLowerCase()}${alfa}`
}
