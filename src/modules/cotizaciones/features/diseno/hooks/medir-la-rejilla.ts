import type { GeometriaDeLaRejilla, Punto } from '../../../entities/diseno/geometria-de-la-rejilla'

// Una rejilla del lienzo medida en el navegador cada vez que se mueve lo que se arrastra sobre ella (la página puede desplazarse mientras): su geometría en
// sus propios px (`geometria-de-la-rejilla.ts`), cómo pasar un punto de la pantalla a esos px (el lienzo va con `zoom`: lo que mide la pantalla dividido por
// lo que mide en CSS) y si en esta vista sus piezas se apilan (debajo del corte de su rejilla van en orden de lectura, sin fila: ahí no se acomoda nada).
export type RejillaMedida = {
  geometria: GeometriaDeLaRejilla
  apilada: boolean
  alPunto: (x: number, y: number) => Punto
}

// El atributo con que cada rejilla se deja encontrar (`data-rejilla`): el id de su lugar del arrastre.
const ATRIBUTO_DE_LA_REJILLA = 'data-rejilla'

const px = (valor: string) => {
  const n = Number.parseFloat(valor)
  return Number.isFinite(n) ? n : 0
}

// `grid-template-columns` y `-rows` resueltos: cada pista en px, también las implícitas.
const pistas = (valor: string) =>
  valor
    .split(/\s+/)
    .map((p) => Number.parseFloat(p))
    .filter((n) => Number.isFinite(n))

const ALTO_DE_UNA_FILA_VACIA_EN_REM = 2.5

// Sus piezas sin fila: la primera de sus hijas que es una pieza no tiene `grid-row-start` (va en el flujo).
function seApila(rejilla: HTMLElement): boolean {
  const primera = rejilla.querySelector<HTMLElement>(':scope > [data-pieza]')
  return primera !== null && getComputedStyle(primera).gridRowStart === 'auto'
}

export function medirLaRejilla(id: string): RejillaMedida | null {
  const el = document.querySelector<HTMLElement>(`[${ATRIBUTO_DE_LA_REJILLA}="${CSS.escape(id)}"]`)
  if (el === null) return null
  const estilo = getComputedStyle(el)
  const caja = el.getBoundingClientRect()
  const ancho = px(estilo.width)
  const escala = ancho > 0 && caja.width > 0 ? caja.width / ancho : 1
  const raiz = px(getComputedStyle(document.documentElement).fontSize)
  const geometria: GeometriaDeLaRejilla = {
    izquierda: px(estilo.paddingLeft),
    arriba: px(estilo.paddingTop),
    columnas: pistas(estilo.gridTemplateColumns),
    filas: pistas(estilo.gridTemplateRows),
    huecoX: px(estilo.columnGap),
    huecoY: px(estilo.rowGap),
    altoDeUnaFilaNueva: ALTO_DE_UNA_FILA_VACIA_EN_REM * (raiz > 0 ? raiz : 16),
  }
  const bordeIzquierdo = px(estilo.borderLeftWidth)
  const bordeDeArriba = px(estilo.borderTopWidth)
  return {
    geometria,
    apilada: seApila(el),
    alPunto: (x, y) => ({
      x: (x - caja.left) / escala - bordeIzquierdo,
      y: (y - caja.top) / escala - bordeDeArriba,
    }),
  }
}
