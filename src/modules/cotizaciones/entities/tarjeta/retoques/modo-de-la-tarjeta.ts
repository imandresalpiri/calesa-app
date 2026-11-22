// Lo puro del modo «Retocar» de la tarjeta: las filas con su banda y su rótulo, qué fila hay bajo el puntero, dónde va el campo de una celda y el aviso de
// los retoques que ya no aplican.
import {
  MAXIMO_DE_CARACTERES_DE_UN_RETOQUE,
  type PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import type { Geometria } from '../geometria-de-la-tarjeta'
import { textoDeLasPartes } from '../../texto-con-datos'

export type FilaDelModo = {
  id: string
  // La banda en px de la tarjeta sin escalar.
  y: number
  alto: number
  oculta: boolean
  // Cómo se nombra la fila: su primer texto o, sin texto, su número.
  rotulo: string
}

// Las filas que se dibujan, con su rótulo (el primer texto de sus celdas, en orden de columna) y si el borrador las oculta. La geometría es la del modo (con
// las filas ocultas dibujadas).
export function filasDelModo(geometria: Geometria, ocultas: ReadonlySet<string>): FilaDelModo[] {
  return geometria.filas.map((f, i) => {
    const texto = geometria.celdas
      .filter((c) => c.fila === f.id && c.contenido.tipo === 'texto')
      .map((c) => (c.contenido.tipo === 'texto' ? c.contenido.lineas.join(' ').trim() : ''))
      .find((t) => t !== '')
    return {
      id: f.id,
      y: f.y,
      alto: f.alto,
      oculta: ocultas.has(f.id),
      rotulo: texto ?? `Fila ${String(i + 1)}`,
    }
  })
}

// La fila cuya banda contiene `y` (en px de la tarjeta sin escalar); nula fuera de todas.
export function filaEnY(filas: readonly FilaDelModo[], y: number): FilaDelModo | null {
  return filas.find((f) => y >= f.y && y < f.y + f.alto) ?? null
}

// Por debajo de esto el campo no se escribe cómodo encima de la celda: va a lo ancho del modal (texto al 200 %, celular, una celda angosta).
export const ESCALA_MINIMA_DEL_CAMPO = 0.75
export const ANCHO_MINIMO_DEL_CAMPO = 160
export const FUENTE_RAIZ_MAXIMA_DEL_CAMPO = 24

export type LugarDelCampo = 'en_la_celda' | 'ancho_del_modal'

// Dónde se edita el texto de una celda: encima de ella si la tarjeta se ve casi a su tamaño, la celda escalada es ancha y la letra no está agrandada; si no, en
// un campo a lo ancho del modal, bajo la tarjeta.
export function lugarDelCampo({
  escala,
  anchoDeLaCelda,
  fuenteRaiz,
}: {
  escala: number
  anchoDeLaCelda: number
  fuenteRaiz: number
}): LugarDelCampo {
  return escala >= ESCALA_MINIMA_DEL_CAMPO &&
    anchoDeLaCelda * escala >= ANCHO_MINIMO_DEL_CAMPO &&
    fuenteRaiz < FUENTE_RAIZ_MAXIMA_DEL_CAMPO
    ? 'en_la_celda'
    : 'ancho_del_modal'
}

// «1 retoque ya no aplica: se quitará al guardar.» / «N retoques ya no aplican: se quitarán al guardar.»; nulo sin ninguno.
export function textoDelAvisoDeNoAplican(n: number): string | null {
  if (n <= 0) return null
  return n === 1
    ? '1 retoque ya no aplica: se quitará al guardar.'
    : `${String(n)} retoques ya no aplican: se quitarán al guardar.`
}

export const MOTIVO_SIN_TEXTOS =
  'Esta cotización usa la tarjeta por omisión: no hay textos para retocar.'
export const MOTIVO_CON_CAMBIOS =
  'Guarda o descarta los cambios de la hoja para retocar la tarjeta.'

// Por qué «Retocar» va apagado; nulo si se puede. La tarjeta por omisión no tiene textos, y con la hoja sin guardar, retocar la volvería a montar (lo tipeado
// en la hoja se perdería).
export function motivoParaNoRetocar({
  porOmision,
  cambiosSinGuardar,
}: {
  porOmision: boolean
  cambiosSinGuardar: boolean
}): string | null {
  if (porOmision) return MOTIVO_SIN_TEXTOS
  return cambiosSinGuardar ? MOTIVO_CON_CAMBIOS : null
}

const LARGO_DEL_NOMBRE = 30

// Cómo se nombra una celda de texto para la persona: su texto de la plantilla (cortado; de un texto con datos, sus partes de texto) o, vacía, su id.
export function nombreDeLaCelda(plantilla: PlantillaEnCuadricula | null, id: string): string {
  const contenido = plantilla?.celdas.find((c) => c.id === id)?.contenido
  const literal =
    contenido?.tipo !== 'texto'
      ? ''
      : 'partes' in contenido
        ? textoDeLasPartes(contenido.partes)
        : contenido.texto
  const texto = literal.replace(/\s+/g, ' ').trim()
  if (texto === '') return id
  const letras = [...texto]
  return letras.length > LARGO_DEL_NOMBRE ? `${letras.slice(0, LARGO_DEL_NOMBRE).join('')}…` : texto
}

export const motivoDelTextoLargo = (nombre: string) =>
  `Acorta el texto de la celda «${nombre}»: tiene más de ${String(MAXIMO_DE_CARACTERES_DE_UN_RETOQUE)} caracteres.`

// Lo que dice el modo al elegir una fila tocando una celda que no es de texto (`tipo`: el de su contenido en la plantilla, nunca el que se dibuja).
export function motivoDeLaCeldaSinTexto(tipo: string | undefined): string {
  if (tipo === 'respaldo' || tipo === 'condiciones')
    return 'Esta celda cambia según la cotización: no se retoca.'
  return tipo === 'dato'
    ? 'Esta celda muestra un dato de la cotización: no se retoca.'
    : 'Esta celda no tiene texto para retocar.'
}
