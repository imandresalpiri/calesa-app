// Las capas que se agregan en el editor de artes: con su tamaño en proporción al formato, centradas en el documento (o en el punto del clic; un
// texto, empezando en él) o en la caja que se dibujó con la herramienta. Y el nombre con que se ve cada capa en «Capas» si nadie la renombró. Puro.
import {
  FOCO_AL_CENTRO,
  type CapaDe,
  type CapaDeArte,
  type Punto,
  type TipoDeCapa,
} from '../documento'
import type { Medidas } from '../formatos'
import type { Caja } from './cajas'
import { FUENTE_POR_DEFECTO } from './fuentes'

export const COLOR_DE_LA_FORMA_NUEVA = '#a1a1aa'
export const COLOR_DEL_TEXTO_NUEVO = '#18181b'
export const TEXTO_NUEVO = 'Texto'
export const LADOS_DEL_POLIGONO_NUEVO = 3
// El largo que se lee del texto de una capa en su nombre visible.
const LARGO_DEL_NOMBRE_DEL_TEXTO = 24

export type QueSeAgrega =
  | { tipo: 'texto'; texto?: string }
  | { tipo: 'forma'; forma: 'rectangulo' | 'elipse' | 'poligono' }
  | { tipo: 'linea'; desde?: Punto; hasta?: Punto }
  // `proporcion` = ancho / alto del archivo.
  | { tipo: 'imagen'; imagenId: string; proporcion: number }
  | { tipo: 'logo'; varianteId: string | null; proporcion: number }
  | { tipo: 'foto'; indice: number }
  | { tipo: 'tarjeta' }

// `inicio`: dónde empieza un texto puesto con un clic (su borde izquierdo y el medio del primer renglón), como el cursor al escribir.
export type DondeSeAgrega = {
  id: string
  medidas: Medidas
  caja?: Caja
  centro?: Punto
  inicio?: Punto
}

const BASE = {
  nombre: null,
  grupoId: null,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
} as const
const SIN_MARCO = { radio: 0, borde: null, grosor: 0 } as const

export function tamanoDelTextoNuevo(medidas: Medidas): number {
  return Math.min(medidas.ancho, medidas.alto) > 1000 ? 48 : 24
}

// La caja de una capa nueva: la dibujada, una de `ancho × alto` que empieza en `inicio` o una centrada.
function cajaNueva(donde: DondeSeAgrega, ancho: number, alto: number): Caja {
  if (donde.caja) {
    return donde.caja
  }
  if (donde.inicio) {
    return { x: donde.inicio.x, y: donde.inicio.y - alto / 2, ancho, alto }
  }
  const medio = donde.centro ?? { x: donde.medidas.ancho / 2, y: donde.medidas.alto / 2 }
  return { x: medio.x - ancho / 2, y: medio.y - alto / 2, ancho, alto }
}

// Lo que entra en `lado × lado` con la proporción del archivo.
function ajustada(lado: number, proporcion: number): { ancho: number; alto: number } {
  const p = Number.isFinite(proporcion) && proporcion > 0 ? proporcion : 1
  return p >= 1 ? { ancho: lado, alto: lado / p } : { ancho: lado * p, alto: lado }
}

function lineaNueva(
  que: Extract<QueSeAgrega, { tipo: 'linea' }>,
  donde: DondeSeAgrega,
): CapaDeArte {
  const corto = Math.min(donde.medidas.ancho, donde.medidas.alto)
  const largo = corto * 0.4
  const medio = donde.centro ?? { x: donde.medidas.ancho / 2, y: donde.medidas.alto / 2 }
  const desde = que.desde ?? { x: medio.x - largo / 2, y: medio.y }
  const hasta = que.hasta ?? { x: medio.x + largo / 2, y: medio.y }
  const x = Math.min(desde.x, hasta.x)
  const y = Math.min(desde.y, hasta.y)
  return {
    ...BASE,
    id: donde.id,
    tipo: 'linea',
    x,
    y,
    ancho: Math.abs(hasta.x - desde.x),
    alto: Math.abs(hasta.y - desde.y),
    puntos: [
      { x: desde.x - x, y: desde.y - y },
      { x: hasta.x - x, y: hasta.y - y },
    ],
    borde: COLOR_DEL_TEXTO_NUEVO,
    grosor: corto > 1000 ? 4 : 2,
  }
}

function textoNuevo(
  que: Extract<QueSeAgrega, { tipo: 'texto' }>,
  donde: DondeSeAgrega,
): CapaDeArte {
  const tamano = tamanoDelTextoNuevo(donde.medidas)
  const caja = cajaNueva(
    donde,
    Math.min(donde.medidas.ancho, donde.medidas.alto) * 0.6,
    tamano * 1.2,
  )
  return {
    ...BASE,
    ...caja,
    id: donde.id,
    tipo: 'texto',
    texto: que.texto ?? TEXTO_NUEVO,
    fuente: FUENTE_POR_DEFECTO,
    tamano,
    peso: 400,
    interlineado: 1.2,
    color: COLOR_DEL_TEXTO_NUEVO,
    alineacion: 'izquierda',
    borde: null,
    grosor: 0,
  }
}

export function nuevaCapa(que: QueSeAgrega, donde: DondeSeAgrega): CapaDeArte {
  const corto = Math.min(donde.medidas.ancho, donde.medidas.alto)
  const id = donde.id
  switch (que.tipo) {
    case 'texto':
      return textoNuevo(que, donde)
    case 'linea':
      return lineaNueva(que, donde)
    case 'forma':
      return {
        ...BASE,
        ...cajaNueva(donde, corto * 0.3, corto * 0.3),
        id,
        tipo: 'forma',
        forma: que.forma,
        lados: que.forma === 'poligono' ? LADOS_DEL_POLIGONO_NUEVO : null,
        relleno: COLOR_DE_LA_FORMA_NUEVA,
        borde: null,
        grosor: 0,
        radio: 0,
      }
    case 'imagen': {
      const { ancho, alto } = ajustada(corto * 0.5, que.proporcion)
      const caja = cajaNueva(donde, ancho, alto)
      return {
        ...BASE,
        ...SIN_MARCO,
        ...caja,
        id,
        tipo: 'imagen',
        imagenId: que.imagenId,
        ajuste: 'cubrir',
      }
    }
    case 'logo': {
      const { ancho, alto } = ajustada(corto * 0.3, que.proporcion)
      return {
        ...BASE,
        ...SIN_MARCO,
        ...cajaNueva(donde, ancho, alto),
        id,
        tipo: 'logo',
        varianteId: que.varianteId,
      }
    }
    case 'foto': {
      const caja = cajaNueva(donde, corto * 0.6, corto * 0.45)
      return {
        ...BASE,
        ...SIN_MARCO,
        ...caja,
        id,
        tipo: 'foto',
        indice: que.indice,
        ajuste: 'cubrir',
        foco: FOCO_AL_CENTRO,
      }
    }
    case 'tarjeta':
      return {
        ...BASE,
        ...SIN_MARCO,
        ...cajaNueva(donde, corto * 0.6, corto * 0.8),
        id,
        tipo: 'tarjeta',
      }
  }
}

const NOMBRE_DE_LA_FORMA = {
  rectangulo: 'Rectángulo',
  elipse: 'Elipse',
  poligono: 'Polígono',
} as const

function nombreDelTexto(texto: string): string {
  const linea = texto.trim().split('\n')[0]?.trim() ?? ''
  if (linea === '') {
    return 'Texto'
  }
  const corto = [...linea].length > LARGO_DEL_NOMBRE_DEL_TEXTO
  return `Texto · ${[...linea].slice(0, LARGO_DEL_NOMBRE_DEL_TEXTO).join('')}${corto ? '…' : ''}`
}

const NOMBRE_POR_TIPO: {
  [T in TipoDeCapa]: (capa: CapaDe<T>, detalle: string | undefined) => string
} = {
  texto: (capa) => nombreDelTexto(capa.texto),
  forma: (capa) => NOMBRE_DE_LA_FORMA[capa.forma],
  linea: () => 'Línea',
  trazo: () => 'Trazo',
  imagen: (_capa, detalle) => (detalle ? `Imagen · ${detalle}` : 'Imagen'),
  logo: (_capa, detalle) => (detalle ? `Logo · ${detalle}` : 'Logo'),
  foto: (capa) => `Foto ${String(capa.indice + 1)}`,
  tarjeta: () => 'Tarjeta de la cotización',
}

// El nombre con que se ve en «Capas»: el que le pusieron o el que dice lo que es. `detalle`, el nombre de la imagen o de la variante del logo.
export function nombreVisible(capa: CapaDeArte, detalle?: string): string {
  if (capa.nombre !== null && capa.nombre.trim() !== '') {
    return capa.nombre
  }
  const nombrar = NOMBRE_POR_TIPO[capa.tipo] as (
    capa: CapaDeArte,
    detalle: string | undefined,
  ) => string
  return nombrar(capa, detalle)
}
