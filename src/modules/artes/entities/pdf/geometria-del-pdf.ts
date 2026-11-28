// La geometría del PDF de una página de un arte: lo mismo que dibuja el lienzo de Konva (`features/editor/components/lienzo/nodos/`), en primitivas
// por posiciones absolutas (`primitivas-del-pdf.ts`). Con las reglas del lienzo: cada capa gira alrededor del centro de su caja; la elipse llena la
// caja; las esquinas de un rectángulo (y de una imagen) no pasan de la mitad del lado más corto; el borde va centrado en el contorno; una línea y un
// trazo llevan las puntas y las uniones redondas y sólo un trazo cerrado lleva relleno; una imagen cubre su caja recortada alrededor de su foco o va
// contenida (siempre el logo y la tarjeta). El texto se parte y se ubica con `disposicionDelTexto()`, la regla del lienzo, en Geist (un PDF no tiene
// otra fuente) y sin sombra ni contorno (`efectosDelFormato()`), igual que en el lienzo de un PDF. No salen la capa oculta (o de un grupo oculto),
// la que se esconde por falta de datos (`capasConDatos()`) ni la imagen que no llegó. Puro: quien arma el PDF mide el texto y las imágenes.
import type { CapasConDatos } from '../datos/capas-con-datos'
import type { CapaConImagen, CapaDe, CapaDeArte, FondoDeArte, PaginaDeArte } from '../documento'
import type { Caja } from '../editor/cajas'
import {
  cajaParaContener,
  puntosDelDegradado,
  puntosDelPoligono,
  recorteParaCubrir,
} from '../editor/dibujo'
import { METRICAS_DE_GEIST, type PesoDeTexto } from '../editor/fuentes'
import { estaOculta } from '../editor/grupos'
import { cajaDelTrazo, datosDelTrazo } from '../editor/pluma'
import type { Medidas } from '../formatos'
import { disposicionDelTexto } from '../texto/disposicion-del-texto'
import { pinturaDe, pinturaOpcional } from './color-del-pdf'
import type { FondoDelPdf, PaginaDelPdf, PrimitivaDelPdf, TrazoDelPdf } from './primitivas-del-pdf'

// El ancho de `texto` en Geist de ese peso y tamaño (pt), con kerning: lo mide el servidor con los TTF del PDF.
export type MedirEnGeist = (texto: string, peso: PesoDeTexto, tamano: number) => number

export type ParaLaGeometria = {
  medidas: Medidas
  conDatos: CapasConDatos
  // Las medidas en px de cada imagen que llegó, por su `src`: una que no está no se dibuja.
  imagenes: ReadonlyMap<string, Medidas>
  medir: MedirEnGeist
}

// Lo que se suma alrededor del dibujo para que su borde (centrado: la mitad afuera) y el suavizado entren en el `<Svg>`.
const HOLGURA = 1

function ampliar(caja: Caja, margen: number): Caja {
  return {
    x: caja.x - margen,
    y: caja.y - margen,
    ancho: caja.ancho + 2 * margen,
    alto: caja.alto + 2 * margen,
  }
}

const margenDe = (borde: TrazoDelPdf | null) => (borde ? borde.grosor : 0) + HOLGURA

function bordeDe(color: string | null, grosor: number, opacidad: number): TrazoDelPdf | null {
  return color === null || grosor <= 0 ? null : { ...pinturaDe(color, opacidad), grosor }
}

// Konva no deja que una esquina pase de la mitad del lado más corto; SVG la limita por eje: se limita acá y los dos dibujan lo mismo.
function radioDe(radio: number, caja: Medidas): number {
  return Math.max(0, Math.min(radio, caja.ancho / 2, caja.alto / 2))
}

const base = (capa: CapaDeArte) => ({
  id: capa.id,
  caja: { x: capa.x, y: capa.y, ancho: capa.ancho, alto: capa.alto },
  rotacion: capa.rotacion,
})

const enLaCaja = (capa: CapaDeArte): Caja => ({ x: 0, y: 0, ancho: capa.ancho, alto: capa.alto })

function deForma(capa: CapaDe<'forma'>): PrimitivaDelPdf {
  const relleno = pinturaOpcional(capa.relleno, capa.opacidad)
  const borde = bordeDe(capa.borde, capa.grosor, capa.opacidad)
  const comun = { ...base(capa), marco: ampliar(enLaCaja(capa), margenDe(borde)), relleno, borde }
  if (capa.forma === 'elipse') {
    return { ...comun, tipo: 'elipse' }
  }
  if (capa.forma === 'poligono') {
    const puntos = puntosDelPoligono(capa.lados ?? 3, capa.ancho, capa.alto)
    return { ...comun, tipo: 'poligono', puntos }
  }
  return { ...comun, tipo: 'rect', radio: radioDe(capa.radio, capa) }
}

function deLinea(capa: CapaDe<'linea'>): PrimitivaDelPdf | null {
  const borde = bordeDe(capa.borde, capa.grosor, capa.opacidad)
  if (!borde) {
    return null
  }
  const [desde, hasta] = capa.puntos
  const x = Math.min(desde.x, hasta.x)
  const y = Math.min(desde.y, hasta.y)
  const alrededor = { x, y, ancho: Math.abs(hasta.x - desde.x), alto: Math.abs(hasta.y - desde.y) }
  return {
    ...base(capa),
    tipo: 'linea',
    marco: ampliar(alrededor, margenDe(borde)),
    desde,
    hasta,
    borde,
  }
}

function deTrazo(capa: CapaDe<'trazo'>): PrimitivaDelPdf | null {
  const relleno = capa.cerrado ? pinturaOpcional(capa.relleno, capa.opacidad) : null
  const borde = bordeDe(capa.borde, capa.grosor, capa.opacidad)
  if (!relleno && !borde) {
    return null
  }
  const marco = ampliar(cajaDelTrazo(capa.nodos, capa.cerrado), margenDe(borde))
  const d = datosDelTrazo(capa.nodos, capa.cerrado)
  return { ...base(capa), tipo: 'trazo', marco, d, relleno, borde }
}

// El alto de la caja es el de la disposición: es el que el lienzo mide y anota (`medirTexto`), y con él gira alrededor del mismo centro.
function deTexto(
  capa: CapaDe<'texto'>,
  texto: string,
  medir: MedirEnGeist,
): PrimitivaDelPdf | null {
  const ascenso = METRICAS_DE_GEIST.ascenso * capa.tamano
  const disposicion = disposicionDelTexto(
    { ...capa, texto },
    {
      medir: (t) => medir(t, capa.peso, capa.tamano),
      ascenso,
      descenso: METRICAS_DE_GEIST.descenso * capa.tamano,
    },
  )
  const lineas = disposicion.lineas
    .filter((l) => l.texto.trim() !== '')
    .map((l) => ({ ...l, arriba: l.base - ascenso }))
  if (lineas.length === 0) {
    return null
  }
  return {
    ...base(capa),
    caja: { x: capa.x, y: capa.y, ancho: capa.ancho, alto: disposicion.alto },
    tipo: 'texto',
    peso: capa.peso,
    tamano: capa.tamano,
    color: pinturaDe(capa.color, capa.opacidad),
    lineas,
  }
}

function deImagen(capa: CapaConImagen, src: string, natural: Medidas): PrimitivaDelPdf {
  const caja = { ancho: capa.ancho, alto: capa.alto }
  const contener = !('ajuste' in capa) || capa.ajuste === 'contener'
  const foco = capa.tipo === 'foto' ? capa.foco : undefined
  const lugar = contener ? cajaParaContener(natural, caja) : { x: 0, y: 0, ...caja }
  const borde = bordeDe(capa.borde, capa.grosor, capa.opacidad)
  return {
    ...base(capa),
    tipo: 'imagen',
    marco: ampliar(lugar, margenDe(borde)),
    src,
    lugar,
    recorte: contener ? null : recorteParaCubrir(natural, caja, foco),
    radio: radioDe(capa.radio, lugar),
    opacidad: capa.opacidad,
    borde,
  }
}

// Las capas que se ven, en orden: ni las ocultas ni las escondidas por falta de datos.
function capasQueSeVen(pagina: PaginaDeArte, conDatos: CapasConDatos): CapaDeArte[] {
  return pagina.capas.filter((c) => !estaOculta(pagina, c) && !conDatos.escondidas.has(c.id))
}

// De dónde sale la imagen de una capa que se ve con estos datos (nulo: ninguna).
function srcDe(capa: CapaDeArte, conDatos: CapasConDatos): string | null {
  const resuelta = conDatos.resueltas.get(capa.id)
  return resuelta?.tipo === 'imagen' ? resuelta.fuente.src : null
}

function deImagenConDatos(capa: CapaConImagen, para: ParaLaGeometria): PrimitivaDelPdf | null {
  const src = srcDe(capa, para.conDatos)
  const natural = src === null ? undefined : para.imagenes.get(src)
  return src !== null && natural ? deImagen(capa, src, natural) : null
}

function deTextoConDatos(capa: CapaDe<'texto'>, para: ParaLaGeometria): PrimitivaDelPdf | null {
  const resuelta = para.conDatos.resueltas.get(capa.id)
  return deTexto(capa, resuelta?.tipo === 'texto' ? resuelta.texto : capa.texto, para.medir)
}

function primitivaDe(capa: CapaDeArte, para: ParaLaGeometria): PrimitivaDelPdf | null {
  switch (capa.tipo) {
    case 'texto':
      return deTextoConDatos(capa, para)
    case 'forma':
      return deForma(capa)
    case 'linea':
      return deLinea(capa)
    case 'trazo':
      return deTrazo(capa)
    case 'imagen':
    case 'logo':
    case 'foto':
    case 'tarjeta':
      return deImagenConDatos(capa, para)
  }
}

function fondoDe(fondo: FondoDeArte, medidas: Medidas): FondoDelPdf {
  if (fondo.tipo === 'color') {
    return { tipo: 'color', color: pinturaDe(fondo.color) }
  }
  const { inicio, fin } = puntosDelDegradado(medidas, fondo.angulo)
  return {
    tipo: 'degradado',
    inicio,
    fin,
    desde: pinturaDe(fondo.desde),
    hasta: pinturaDe(fondo.hasta),
  }
}

export function geometriaDelPdf(pagina: PaginaDeArte, para: ParaLaGeometria): PaginaDelPdf {
  const primitivas = capasQueSeVen(pagina, para.conDatos).flatMap((capa) => {
    const primitiva = primitivaDe(capa, para)
    return primitiva ? [primitiva] : []
  })
  return { medidas: para.medidas, fondo: fondoDe(pagina.fondo, para.medidas), primitivas }
}

// Las imágenes que pide el PDF de una página con estos datos, sin repetir: las de las capas que se ven.
export function imagenesDeLaPagina(pagina: PaginaDeArte, conDatos: CapasConDatos): string[] {
  const srcs = capasQueSeVen(pagina, conDatos).map((c) => srcDe(c, conDatos))
  return [...new Set(srcs.filter((s): s is string => s !== null))]
}
