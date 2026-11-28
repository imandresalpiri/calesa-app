// Las cuentas del lienzo del editor de artes que no tocan Konva: qué es un clic, la caja que se dibuja arrastrando, qué capas se mueven y
// contra cuáles se ajustan, la capa que deja el Transformer, qué asas ofrece según lo elegido y el trazo que arma la pluma. En unidades del
// documento salvo `esClic` (px de pantalla). Puro.
import type { CapaDe, CapaDeArte, NodoDelTrazo, PaginaDeArte, Punto } from '../documento'
import type { Medidas } from '../formatos'
import type { HerramientaDelEditor } from './atajos'
import { cajaDe, union, type Caja } from './cajas'
import { COLOR_DEL_TEXTO_NUEVO, nuevaCapa, type QueSeAgrega } from './capas-nuevas'
import { estaBloqueada, estaOculta } from './grupos'
import { escalarNodos, normalizar } from './pluma'

// Lo que se puede correr el puntero, en px de pantalla, y seguir siendo un clic.
export const ARRASTRE_MINIMO = 3

export function esClic(desde: Punto, hasta: Punto): boolean {
  return Math.hypot(hasta.x - desde.x, hasta.y - desde.y) < ARRASTRE_MINIMO
}

// La caja entre dos puntos, en cualquier dirección. `cuadrada` (con Mayús): del lado mayor, hacia donde va el puntero.
export function cajaDeArrastre(desde: Punto, hasta: Punto, cuadrada = false): Caja {
  let dx = hasta.x - desde.x
  let dy = hasta.y - desde.y
  if (cuadrada) {
    const lado = Math.max(Math.abs(dx), Math.abs(dy))
    dx = Math.sign(dx || 1) * lado
    dy = Math.sign(dy || 1) * lado
  }
  return {
    x: Math.min(desde.x, desde.x + dx),
    y: Math.min(desde.y, desde.y + dy),
    ancho: Math.abs(dx),
    alto: Math.abs(dy),
  }
}

export type HerramientaDeDibujo = Extract<
  HerramientaDelEditor,
  'texto' | 'rectangulo' | 'elipse' | 'poligono' | 'linea'
>

const DE_DIBUJO: readonly HerramientaDelEditor[] = [
  'texto',
  'rectangulo',
  'elipse',
  'poligono',
  'linea',
]

// Las herramientas que dibujan una capa con un clic o arrastrando una caja (la pluma va aparte).
export function esDeDibujo(herramienta: HerramientaDelEditor): herramienta is HerramientaDeDibujo {
  return DE_DIBUJO.includes(herramienta)
}

// Lo que dejó la herramienta en el documento. `hasta` nulo es un clic: la capa nueva con su tamaño de siempre, centrada en el punto; si no,
// la caja arrastrada (cuadrada con Mayús) o, la línea, de un punto al otro.
export function capaDibujada(
  herramienta: HerramientaDeDibujo,
  gesto: { desde: Punto; hasta: Punto | null; cuadrada: boolean },
  donde: { id: string; medidas: Medidas },
): CapaDeArte {
  const { desde, hasta, cuadrada } = gesto
  if (herramienta === 'linea') {
    return hasta
      ? nuevaCapa({ tipo: 'linea', desde, hasta }, donde)
      : nuevaCapa({ tipo: 'linea' }, { ...donde, centro: desde })
  }
  if (herramienta === 'texto') {
    // Con un clic, el texto empieza donde se hizo, como el cursor: centrado, lo escrito arrancaría a la izquierda del clic y la página lo cortaría.
    return hasta
      ? nuevaCapa({ tipo: 'texto' }, { ...donde, caja: cajaDeArrastre(desde, hasta, cuadrada) })
      : nuevaCapa({ tipo: 'texto' }, { ...donde, inicio: desde })
  }
  const que: QueSeAgrega = { tipo: 'forma', forma: herramienta }
  return hasta
    ? nuevaCapa(que, { ...donde, caja: cajaDeArrastre(desde, hasta, cuadrada) })
    : nuevaCapa(que, { ...donde, centro: desde })
}

// Lo que se mueve al arrastrar lo elegido: lo visible y sin candado (ni el de su grupo).
export function idsQueSeMueven(pagina: PaginaDeArte, ids: readonly string[]): string[] {
  const elegidas = new Set(ids)
  return pagina.capas
    .filter((c) => elegidas.has(c.id) && !estaBloqueada(pagina, c) && !estaOculta(pagina, c))
    .map((c) => c.id)
}

// Contra qué se ajusta lo que se mueve (las guías inteligentes): las demás capas visibles.
export function cajasParaAjustar(pagina: PaginaDeArte, ids: readonly string[]): Caja[] {
  const movidas = new Set(ids)
  return pagina.capas.filter((c) => !movidas.has(c.id) && !estaOculta(pagina, c)).map(cajaDe)
}

// La caja que encierra a las que se mueven, corrida por (dx, dy); nula si no hay ninguna.
export function cajaMovida(
  pagina: PaginaDeArte,
  ids: readonly string[],
  corrimiento: Punto,
): Caja | null {
  const movidas = new Set(ids)
  const caja = union(pagina.capas.filter((c) => movidas.has(c.id)).map(cajaDe))
  return caja && { ...caja, x: caja.x + corrimiento.x, y: caja.y + corrimiento.y }
}

// Lo que dejó el Transformer en un nodo: su centro (cada nodo gira alrededor del centro de su caja), cuánto escaló cada eje y el giro.
export type Transformacion = { centro: Punto; sx: number; sy: number; rotacion: number }

const escalar = (p: Punto, sx: number, sy: number): Punto => ({ x: p.x * sx, y: p.y * sy })

// La capa tras el Transformer. Un texto nunca escala: cambia su ancho y conserva su tamaño de letra y su alto (el lienzo lo vuelve a medir).
// La línea escala sus puntos y el trazo sus nodos y asas.
export function capaTransformada(capa: CapaDeArte, t: Transformacion): CapaDeArte {
  const sx = Math.abs(t.sx)
  const sy = capa.tipo === 'texto' ? 1 : Math.abs(t.sy)
  const ancho = capa.ancho * sx
  const alto = capa.alto * sy
  const caja = {
    x: t.centro.x - ancho / 2,
    y: t.centro.y - alto / 2,
    ancho,
    alto,
    rotacion: t.rotacion,
  }
  if (capa.tipo === 'linea') {
    return {
      ...capa,
      ...caja,
      puntos: [escalar(capa.puntos[0], sx, sy), escalar(capa.puntos[1], sx, sy)],
    }
  }
  if (capa.tipo === 'trazo') {
    return { ...capa, ...caja, nodos: escalarNodos(capa.nodos, sx, sy) }
  }
  return { ...capa, ...caja }
}

export const TODAS_LAS_ANCLAS: readonly string[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-right',
  'middle-left',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]
const DE_LOS_COSTADOS: readonly string[] = ['middle-left', 'middle-right']
const DE_ARRIBA_Y_ABAJO: readonly string[] = ['top-center', 'bottom-center']
// Menos que esto, el lado de una línea no tiene largo: escalarlo dividiría por cero.
const LADO_SIN_LARGO = 1

// Las asas del Transformer según lo elegido. Un texto sólo cambia su ancho, así que con un texto entre varios no hay asas (se gira). Una
// línea recta (horizontal o vertical) sólo se estira a lo largo.
export function anclasDeLaSeleccion(capas: readonly CapaDeArte[]): readonly string[] {
  const [unica, ...resto] = capas
  if (!unica) {
    return []
  }
  if (capas.some((c) => c.tipo === 'texto')) {
    return resto.length === 0 ? DE_LOS_COSTADOS : []
  }
  if (resto.length === 0 && unica.tipo === 'linea') {
    if (unica.alto < LADO_SIN_LARGO) {
      return DE_LOS_COSTADOS
    }
    if (unica.ancho < LADO_SIN_LARGO) {
      return DE_ARRIBA_Y_ABAJO
    }
  }
  return TODAS_LAS_ANCLAS
}

// El trazo que deja la pluma: sus nodos se dibujan en unidades del documento y la caja se rehace para encerrar la curva.
export function trazoNuevo(
  id: string,
  nodos: readonly NodoDelTrazo[],
  cerrado: boolean,
  medidas: Medidas,
): CapaDe<'trazo'> {
  return normalizar({
    id,
    nombre: null,
    grupoId: null,
    x: 0,
    y: 0,
    ancho: 0,
    alto: 0,
    rotacion: 0,
    opacidad: 1,
    bloqueada: false,
    oculta: false,
    sombra: null,
    tipo: 'trazo',
    nodos: [...nodos],
    cerrado,
    relleno: null,
    borde: COLOR_DEL_TEXTO_NUEVO,
    grosor: Math.min(medidas.ancho, medidas.alto) > 1000 ? 4 : 2,
  })
}
