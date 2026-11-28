import Konva from 'konva'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { partirEnLineas } from '../../../../../entities/texto/disposicion-del-texto'

// `partirEnLineas()` es el corte de Konva 10.11 con `wrap: 'word'` llevado a una regla pura: el lienzo le pasa a Konva las líneas ya partidas
// (`wrap="none"`) y el PDF parte con la misma. Si Konva cambia su corte al actualizarse, esto lo dice. Konva mide con un contexto de canvas
// (jsdom no tiene): uno falso donde cada grafema mide 10, el mismo `medir` que recibe la regla.
const segmentador = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const medir = (texto: string) => [...segmentador.segment(texto)].length * 10

const contextoFalso = {
  font: '',
  fontKerning: 'auto',
  fillStyle: '',
  save() {},
  restore() {},
  clearRect() {},
  fillRect() {},
  getImageData: () => ({ data: new Uint8ClampedArray(400) }),
  measureText: (texto: string) => ({ width: medir(texto) }),
}

const original = Konva.Util.createCanvasElement

beforeAll(() => {
  Konva.Util.createCanvasElement = () =>
    ({ getContext: () => contextoFalso }) as unknown as HTMLCanvasElement
})

afterAll(() => {
  Konva.Util.createCanvasElement = original
})

function lineasDeKonva(texto: string, ancho: number): string[] {
  const nodo = new Konva.Text({ text: texto, width: ancho, wrap: 'word', fontSize: 10 })
  return nodo.textArr.map((l) => l.text)
}

const CASOS: readonly [string, number][] = [
  ['hola mundo feliz', 100],
  ['hola   mundo feliz', 100],
  ['ultra-liviano y eficiente', 80],
  ['a--b c-d', 30],
  ['abcdefghij', 40],
  ['Toyota Land Cruiser Prado 2021 · 4x4 diésel', 120],
  ['uno\n\ndos tres\r\ncuatro cinco seis', 60],
  ['precio final: 45.990 USD (CIF Arica)', 90],
  ['日本語のテキスト、句読点。', 40],
  ['   empieza con espacios y termina con espacios   ', 70],
  ['🇧🇴🇧🇴 bandera', 25],
  ['', 50],
]

describe('el corte del texto', () => {
  it.each(CASOS)('parte %j en %d como Konva', (texto, ancho) => {
    expect(partirEnLineas(texto, ancho, medir)).toEqual(lineasDeKonva(texto, ancho))
  })
})
