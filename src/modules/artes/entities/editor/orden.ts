// El orden de las capas en el editor de artes. La página las guarda de abajo hacia arriba (la última se dibuja encima); «Capas» las muestra al
// revés. Un grupo se ordena entero, como un bloque; si se eligen sólo algunos de sus miembros, se ordenan dentro de él. Puro.
import type { CapaDeArte, GrupoDeCapas, PaginaDeArte } from '../documento'
import { limpiarGrupos } from './grupos'

export type HaciaDonde = 'frente' | 'atras' | 'subir' | 'bajar'

// Las capas en bloques: los miembros de un grupo juntos, cada suelta sola.
function bloquesDe(capas: readonly CapaDeArte[]): CapaDeArte[][] {
  const bloques: CapaDeArte[][] = []
  for (const capa of capas) {
    const ultimo = bloques.at(-1)
    if (ultimo && capa.grupoId !== null && ultimo[0]?.grupoId === capa.grupoId) {
      ultimo.push(capa)
    } else {
      bloques.push([capa])
    }
  }
  return bloques
}

function intercambiar<T>(items: T[], i: number, j: number): void {
  const a = items[i]
  const b = items[j]
  if (a !== undefined && b !== undefined) {
    items[i] = b
    items[j] = a
  }
}

// Al frente o al fondo, todas las elegidas en su orden; un paso, cada elegida pasa a la que no lo está de al lado.
function reordenar<T>(items: readonly T[], elegido: (item: T) => boolean, hacia: HaciaDonde): T[] {
  const si = items.filter(elegido)
  const no = items.filter((item) => !elegido(item))
  if (hacia === 'frente') {
    return [...no, ...si]
  }
  if (hacia === 'atras') {
    return [...si, ...no]
  }
  const salida = [...items]
  const esElegido = (i: number) => {
    const item = salida[i]
    return item !== undefined && elegido(item)
  }
  if (hacia === 'subir') {
    for (let i = salida.length - 2; i >= 0; i--) {
      if (esElegido(i) && !esElegido(i + 1)) {
        intercambiar(salida, i, i + 1)
      }
    }
    return salida
  }
  for (let i = 1; i < salida.length; i++) {
    if (esElegido(i) && !esElegido(i - 1)) {
      intercambiar(salida, i, i - 1)
    }
  }
  return salida
}

const mismoOrden = (a: readonly CapaDeArte[], b: readonly CapaDeArte[]) =>
  a.length === b.length && a.every((capa, i) => capa === b[i])

// El grupo dentro del cual se ordena: el de las elegidas si son todas del mismo y no están todos sus miembros.
function grupoDondeSeOrdena(pagina: PaginaDeArte, elegidos: ReadonlySet<string>): string | null {
  const tocadas = pagina.capas.filter((c) => elegidos.has(c.id))
  const grupo = tocadas[0]?.grupoId ?? null
  if (grupo === null || tocadas.some((c) => c.grupoId !== grupo)) {
    return null
  }
  return pagina.capas.some((c) => c.grupoId === grupo && !elegidos.has(c.id)) ? grupo : null
}

export function ordenar(
  pagina: PaginaDeArte,
  ids: readonly string[],
  hacia: HaciaDonde,
): PaginaDeArte {
  const elegidos = new Set(ids)
  const grupo = grupoDondeSeOrdena(pagina, elegidos)
  let capas: CapaDeArte[]
  if (grupo === null) {
    const bloques = reordenar(
      bloquesDe(pagina.capas),
      (b) => b.some((c) => elegidos.has(c.id)),
      hacia,
    )
    capas = bloques.flat()
  } else {
    const desde = pagina.capas.findIndex((c) => c.grupoId === grupo)
    const hasta = pagina.capas.findLastIndex((c) => c.grupoId === grupo)
    const miembros = reordenar(
      pagina.capas.slice(desde, hasta + 1),
      (c) => elegidos.has(c.id),
      hacia,
    )
    capas = [...pagina.capas.slice(0, desde), ...miembros, ...pagina.capas.slice(hasta + 1)]
  }
  return mismoOrden(capas, pagina.capas) ? pagina : { ...pagina, capas }
}

type Tramo = { desde: number; hasta: number }

function tramoDelGrupo(capas: readonly CapaDeArte[], grupoId: string): Tramo | null {
  const desde = capas.findIndex((c) => c.grupoId === grupoId)
  return desde < 0 ? null : { desde, hasta: capas.findLastIndex((c) => c.grupoId === grupoId) }
}

// Dónde se inserta lo arrastrado: junto a la capa de destino si se une a su grupo; si no, junto a su bloque entero.
function tramoDelDestino(
  resto: readonly CapaDeArte[],
  sobre: string,
  uneAlGrupo: boolean,
): Tramo | null {
  const i = resto.findIndex((c) => c.id === sobre)
  const capa = resto[i]
  if (capa === undefined) {
    return tramoDelGrupo(resto, sobre)
  }
  return uneAlGrupo || capa.grupoId === null
    ? { desde: i, hasta: i }
    : tramoDelGrupo(resto, capa.grupoId)
}

// Arrastrar una fila de «Capas» (una capa o un grupo, por su id) sobre otra: queda encima de ella si subía y debajo si bajaba. Una capa que
// cae sobre un miembro de un grupo entra a ese grupo; sobre una suelta o sobre la fila de un grupo, queda suelta. Un grupo nunca entra a otro.
export function moverEnCapas(
  pagina: PaginaDeArte,
  arrastrado: string,
  sobre: string,
): PaginaDeArte {
  const arrastre = leerArrastre(pagina, arrastrado, sobre)
  if (arrastre === null) {
    return pagina
  }
  const { movidas, destino, esGrupo } = arrastre
  const grupoId = esGrupo ? arrastrado : (destino?.grupoId ?? null)
  const resto = pagina.capas.filter((c) => !movidas.includes(c))
  const tramo = tramoDelDestino(resto, sobre, !esGrupo && grupoId !== null)
  const indiceDelDestino = destino
    ? pagina.capas.indexOf(destino)
    : pagina.capas.findIndex((c) => c.grupoId === sobre)
  if (tramo === null || indiceDelDestino < 0) {
    return pagina
  }
  const sube = indiceDelDestino > pagina.capas.findIndex((c) => movidas.includes(c))
  const puestas = movidas.map((c) => (c.grupoId === grupoId ? c : { ...c, grupoId }))
  const posicion = sube ? tramo.hasta + 1 : tramo.desde
  const capas = [...resto.slice(0, posicion), ...puestas, ...resto.slice(posicion)]
  return mismoOrden(capas, pagina.capas) ? pagina : limpiarGrupos({ ...pagina, capas })
}

type Arrastre = { movidas: CapaDeArte[]; destino: CapaDeArte | undefined; esGrupo: boolean }

// Lo que se arrastra (la capa, o los miembros del grupo) y la capa de destino (nula si es la fila de un grupo). Nulo si no hay qué mover.
function leerArrastre(pagina: PaginaDeArte, arrastrado: string, sobre: string): Arrastre | null {
  const esGrupo = pagina.grupos.some((g) => g.id === arrastrado)
  const movidas = pagina.capas.filter((c) =>
    esGrupo ? c.grupoId === arrastrado : c.id === arrastrado,
  )
  const destino = pagina.capas.find((c) => c.id === sobre)
  if (
    movidas.length === 0 ||
    arrastrado === sobre ||
    (destino !== undefined && movidas.includes(destino))
  ) {
    return null
  }
  return { movidas, destino, esGrupo }
}

export type FilaDeCapas =
  | { tipo: 'grupo'; grupo: GrupoDeCapas; miembros: number }
  | { tipo: 'capa'; capa: CapaDeArte; enGrupo: boolean }

// Las filas de «Capas», de arriba hacia abajo: cada grupo con su fila y sus miembros debajo, sangrados.
export function filasDeCapas(pagina: PaginaDeArte): FilaDeCapas[] {
  const filas: FilaDeCapas[] = []
  for (const bloque of bloquesDe(pagina.capas).reverse()) {
    const grupoId = bloque[0]?.grupoId ?? null
    const grupo = grupoId === null ? undefined : pagina.grupos.find((g) => g.id === grupoId)
    if (grupo) {
      filas.push({ tipo: 'grupo', grupo, miembros: bloque.length })
    }
    for (const capa of [...bloque].reverse()) {
      filas.push({ tipo: 'capa', capa, enGrupo: grupo !== undefined })
    }
  }
  return filas
}
