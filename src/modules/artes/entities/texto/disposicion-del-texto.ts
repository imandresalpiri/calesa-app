// La regla con que se parte y se ubica el texto de una capa, la misma en el lienzo del editor y en el PDF (docs/LECCIONES.md › «Un texto que
// dibujan dos motores se parte con una sola regla»): el corte de Konva 10.11 con `wrap: 'word'`, llevado acá para que react-pdf no corte con el
// suyo (Knuth-Plass corta distinto en los bordes). Con una sola regla, lo único que puede diferir entre los dos son las medidas, y las dos salen
// de los mismos TTF. Las unidades son las del formato (pt en un PDF). Puro: quien mide (`medir`, el ancho de un texto con la fuente, el peso y el
// tamaño de la capa, con kerning) lo inyecta.
//
// El corte: cada párrafo (`\n`) que no entra se parte en el prefijo más largo que entra, retrocediendo al último espacio o guion; sin ningún punto
// de corte, por grafema. Cada línea partida va sin los espacios del final y la siguiente empieza tras los del corte. Una línea vacía cuenta. A
// diferencia de Konva, una caja más angosta que un grafema no pierde el resto del párrafo: va un grafema por línea (desborda, nunca se esconde).
//
// La posición: la base de la línea i está en `i·lh + (A − D)/2 + lh/2` desde arriba de la caja (`lh` = tamaño × interlineado; A y D, el ascenso
// y el descenso de la fuente a ese tamaño), la fórmula de Konva con `textBaseline: 'alphabetic'`; `x`, según la alineación y el ancho medido. El
// alto es líneas × lh: un texto que no entra crece hacia abajo igual en los dos, nunca se achica ni se corta.

export type Medir = (texto: string) => number

export type MetricasDelTexto = {
  medir: Medir
  // El ascenso y el descenso (positivo) de la fuente al tamaño de la capa: `fontBoundingBoxAscent` y `fontBoundingBoxDescent` en el navegador.
  ascenso: number
  descenso: number
}

export type TextoParaDisponer = {
  texto: string
  ancho: number
  tamano: number
  interlineado: number
  alineacion: 'izquierda' | 'centro' | 'derecha'
}

export type LineaDispuesta = { texto: string; x: number; base: number; ancho: number }

export type DisposicionDelTexto = { lineas: LineaDispuesta[]; alto: number }

const ESPACIO = ' '
const GUION = '-'
// El chino y el japonés no separan con espacios: se corta junto a cualquiera de sus caracteres, salvo la puntuación que va pegada.
const CJK = /[\p{Script=Han}　-ヿ＀-ﾟ]/u
const NO_EMPIEZA_LINEA = /[\p{Pe}\p{Pf}\p{Pd}、。，．！？：；…・,.!?:;々〻ゝゞヽヾ〃｡､･％]/u
const NO_TERMINA_LINEA = /[\p{Ps}\p{Pi}]/u

const segmentador = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function grafemasDe(texto: string): string[] {
  return Array.from(segmentador.segment(texto), (s) => s.segment)
}

// Una línea puede terminar antes o en un espacio, después de un guion (nunca antes de uno) o junto a un carácter chino o japonés.
function esCorte(g: readonly string[], i: number): boolean {
  const aca = g[i] ?? ''
  const sigue = g[i + 1] ?? ''
  return (
    aca === ESPACIO ||
    sigue === ESPACIO ||
    (aca === GUION && sigue !== GUION) ||
    ((CJK.test(aca) || CJK.test(sigue)) &&
      !NO_EMPIEZA_LINEA.test(sigue) &&
      !NO_TERMINA_LINEA.test(aca))
  )
}

// El fin del prefijo más largo de `g[inicio…]` que entra: una ventana que crece desde lo estimado hasta que no entra, y después una búsqueda
// binaria adentro (cada prueba mide más o menos una línea: partir es lineal). Igual que Konva.
function finQueEntra(
  g: readonly string[],
  inicio: number,
  porLinea: number,
  entra: (fin: number) => boolean,
): number {
  const n = g.length
  let bajo = inicio
  let alto = Math.min(n, inicio + porLinea)
  while (entra(alto)) {
    bajo = alto
    if (alto === n) {
      return n
    }
    alto = Math.min(n, alto + (alto - inicio))
  }
  while (alto - bajo > 1) {
    const medio = (bajo + alto) >>> 1
    if (entra(medio)) {
      bajo = medio
    } else {
      alto = medio
    }
  }
  return bajo
}

function partirElParrafo(parrafo: string, ancho: number, medir: Medir): string[] {
  const anchoDelParrafo = medir(parrafo)
  if (anchoDelParrafo <= ancho) {
    return [parrafo]
  }
  const g = grafemasDe(parrafo)
  const n = g.length
  const lineas: string[] = []
  const porLinea = Math.max(1, Math.ceil((n * Math.max(ancho, 0)) / anchoDelParrafo))
  let inicio = 0
  while (inicio < n) {
    const desde = inicio
    const trozo = (fin: number) => g.slice(desde, fin).join('')
    let fin = finQueEntra(g, inicio, porLinea, (f) => medir(trozo(f)) <= ancho)
    if (fin === n) {
      lineas.push(trozo(n))
      break
    }
    if (fin === inicio) {
      fin = inicio + 1
    } else {
      let corte = fin - 1
      while (corte >= inicio && !esCorte(g, corte)) {
        corte--
      }
      if (corte >= inicio) {
        fin = corte + 1
      }
    }
    lineas.push(trozo(fin).trimEnd())
    inicio = fin
    while (inicio < n && (g[inicio] ?? '').trim() === '') {
      inicio++
    }
  }
  return lineas
}

// Las líneas del texto en una caja de `ancho`, en orden.
export function partirEnLineas(texto: string, ancho: number, medir: Medir): string[] {
  return texto.split(/\r?\n/).flatMap((parrafo) => partirElParrafo(parrafo, ancho, medir))
}

const X_DE_LA_LINEA: Record<TextoParaDisponer['alineacion'], (libre: number) => number> = {
  izquierda: () => 0,
  centro: (libre) => libre / 2,
  derecha: (libre) => libre,
}

// Las líneas con su posición relativa a la esquina de la caja sin rotar, y el alto que ocupan.
export function disposicionDelTexto(
  capa: TextoParaDisponer,
  { medir, ascenso, descenso }: MetricasDelTexto,
): DisposicionDelTexto {
  const lh = capa.tamano * capa.interlineado
  const primera = (ascenso - descenso) / 2 + lh / 2
  const lineas = partirEnLineas(capa.texto, capa.ancho, medir).map((texto, i) => {
    const ancho = medir(texto)
    return {
      texto,
      x: X_DE_LA_LINEA[capa.alineacion](capa.ancho - ancho),
      base: primera + i * lh,
      ancho,
    }
  })
  return { lineas, alto: lineas.length * lh }
}
