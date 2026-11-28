// Lo que dibuja el PDF de una página de un arte, por posiciones absolutas en pt desde la esquina de arriba a la izquierda (docs/LECCIONES.md › «Un
// dibujo que comparten varios motores va por posiciones absolutas desde una geometría pura»): el fondo y una primitiva por capa que se ve, en el
// orden de las capas (la primera, abajo). `geometria-del-pdf.ts` las arma; `infra/pdf/documento-del-arte.tsx` sólo las pinta. Tipos, sin código.
import type { Punto } from '../documento'
import type { Caja } from '../editor/cajas'
import type { PesoDeTexto } from '../editor/fuentes'
import type { Medidas } from '../formatos'
import type { PinturaDelPdf } from './color-del-pdf'

export type TrazoDelPdf = PinturaDelPdf & { grosor: number }

// Lo común: la capa de la que sale y su caja sin rotar, que gira `rotacion` grados (a la derecha) alrededor de su centro, como en el lienzo. Lo que
// va adentro (puntos, líneas de texto, el lugar de una imagen) es relativo a la esquina de esa caja.
type Base = { id: string; caja: Caja; rotacion: number }

// Lo que se dibuja como vector va en un `<Svg>`, y react-pdf recorta un `<Svg>` a su caja: `marco` es la parte de la caja (relativa a su
// esquina) que cubre el dibujo con su borde.
type ConSvg = Base & { marco: Caja }

export type LineaDelPdf = {
  texto: string
  x: number
  // La base de la línea y su borde de arriba (la base menos el ascenso de la fuente): react-pdf ubica un texto por su borde de arriba.
  base: number
  arriba: number
  ancho: number
}

export type PrimitivaDelPdf =
  | (ConSvg & {
      tipo: 'rect'
      radio: number
      relleno: PinturaDelPdf | null
      borde: TrazoDelPdf | null
    })
  | (ConSvg & { tipo: 'elipse'; relleno: PinturaDelPdf | null; borde: TrazoDelPdf | null })
  | (ConSvg & {
      tipo: 'poligono'
      puntos: readonly number[]
      relleno: PinturaDelPdf | null
      borde: TrazoDelPdf | null
    })
  | (ConSvg & { tipo: 'linea'; desde: Punto; hasta: Punto; borde: TrazoDelPdf })
  | (ConSvg & {
      tipo: 'trazo'
      d: string
      relleno: PinturaDelPdf | null
      borde: TrazoDelPdf | null
    })
  | (Base & {
      tipo: 'texto'
      peso: PesoDeTexto
      tamano: number
      color: PinturaDelPdf
      lineas: readonly LineaDelPdf[]
    })
  | (ConSvg & {
      tipo: 'imagen'
      src: string
      // Dónde va la imagen en la caja: la caja entera al cubrirla, o la parte que ocupa contenida.
      lugar: Caja
      // La parte de la imagen (en sus px) que se ve al cubrir la caja; nula, la imagen entera.
      recorte: Caja | null
      radio: number
      opacidad: number
      // El borde va alrededor del lugar, con las esquinas del mismo radio; `marco` lo cubre.
      borde: TrazoDelPdf | null
    })

export type TipoDePrimitiva = PrimitivaDelPdf['tipo']

export type FondoDelPdf =
  | { tipo: 'color'; color: PinturaDelPdf }
  | { tipo: 'degradado'; inicio: Punto; fin: Punto; desde: PinturaDelPdf; hasta: PinturaDelPdf }

export type PaginaDelPdf = {
  medidas: Medidas
  fondo: FondoDelPdf
  primitivas: readonly PrimitivaDelPdf[]
}
