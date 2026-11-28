import { describe, expect, it } from 'vitest'
import {
  accionDeLaTecla,
  ATAJOS_DEL_EDITOR,
  esCampoEditable,
  GRUPO_DE_AYUDA_DEL_EDITOR,
  type TeclaDelEditor,
} from './atajos'

function tecla(key: string, extra: Partial<TeclaDelEditor> = {}): TeclaDelEditor {
  const code = /^[a-z]$/i.test(key)
    ? `Key${key.toUpperCase()}`
    : /^[0-9]$/.test(key)
      ? `Digit${key}`
      : key === ' '
        ? 'Space'
        : key
  return {
    key,
    code,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    ...extra,
  }
}

const bajar = (t: TeclaDelEditor) => accionDeLaTecla(t, 'bajar')
const conCtrl = (key: string, extra: Partial<TeclaDelEditor> = {}) =>
  tecla(key, { ctrlKey: true, ...extra })

describe('las herramientas por su letra', () => {
  it.each([
    ['v', 'mover'],
    ['h', 'mano'],
    ['t', 'texto'],
    ['r', 'rectangulo'],
    ['e', 'elipse'],
    ['l', 'linea'],
    ['p', 'pluma'],
  ])('%s elige %s', (letra, herramienta) => {
    expect(bajar(tecla(letra))).toEqual({ tipo: 'herramienta', herramienta })
  })

  it('con Bloq Mayús la letra llega en mayúscula y sigue valiendo', () => {
    expect(bajar(tecla('V', { code: 'KeyV' }))).toEqual({
      tipo: 'herramienta',
      herramienta: 'mover',
    })
  })

  it('con Mayús o Alt una letra no elige herramienta, y una letra sin atajo no hace nada', () => {
    expect(bajar(tecla('V', { shiftKey: true }))).toBeNull()
    expect(bajar(tecla('r', { altKey: true }))).toBeNull()
    expect(bajar(tecla('x'))).toBeNull()
    expect(accionDeLaTecla(tecla('v'), 'subir')).toBeNull()
  })
})

describe('la mano transitoria con Espacio', () => {
  it('al bajar se activa y al subir se suelta', () => {
    expect(bajar(tecla(' '))).toEqual({ tipo: 'mano-transitoria', activa: true })
    expect(accionDeLaTecla(tecla(' '), 'subir')).toEqual({
      tipo: 'mano-transitoria',
      activa: false,
    })
  })

  it('la repetición de la tecla apretada no hace nada', () => {
    expect(bajar(tecla(' ', { repeat: true }))).toBeNull()
  })

  it('con Ctrl no es la mano', () => {
    expect(bajar(conCtrl(' '))).toBeNull()
  })
})

describe('la edición con mod', () => {
  it.each([
    ['z', { tipo: 'deshacer' }],
    ['y', { tipo: 'rehacer' }],
    ['c', { tipo: 'copiar' }],
    ['v', { tipo: 'pegar' }],
    ['d', { tipo: 'duplicar' }],
    ['a', { tipo: 'elegir-todo' }],
    ['g', { tipo: 'agrupar' }],
    ['0', { tipo: 'ajustar' }],
    ['1', { tipo: 'al-cien' }],
    [']', { tipo: 'ordenar', hacia: 'subir' }],
    ['[', { tipo: 'ordenar', hacia: 'bajar' }],
  ])('mod+%s', (key, accion) => {
    expect(bajar(conCtrl(key))).toEqual(accion)
    expect(bajar(tecla(key, { metaKey: true }))).toEqual(accion)
  })

  it('con Mayús: rehacer, desagrupar, al frente y al fondo', () => {
    expect(bajar(conCtrl('Z', { shiftKey: true, code: 'KeyZ' }))).toEqual({ tipo: 'rehacer' })
    expect(bajar(conCtrl('G', { shiftKey: true, code: 'KeyG' }))).toEqual({ tipo: 'desagrupar' })
    expect(bajar(conCtrl('}', { shiftKey: true, code: 'BracketRight' }))).toEqual({
      tipo: 'ordenar',
      hacia: 'frente',
    })
    expect(bajar(conCtrl('{', { shiftKey: true, code: 'BracketLeft' }))).toEqual({
      tipo: 'ordenar',
      hacia: 'atras',
    })
  })

  it('en un teclado en español el corchete sale de la tecla física', () => {
    expect(bajar(conCtrl('+', { code: 'BracketRight' }))).toEqual({
      tipo: 'ordenar',
      hacia: 'subir',
    })
    expect(bajar(conCtrl('`', { code: 'BracketLeft' }))).toEqual({
      tipo: 'ordenar',
      hacia: 'bajar',
    })
  })

  it('una letra con mod que no es atajo no hace nada', () => {
    expect(bajar(conCtrl('k'))).toBeNull()
    expect(bajar(conCtrl('s'))).toBeNull()
    expect(bajar(conCtrl('c', { shiftKey: true }))).toBeNull()
  })
})

describe('mover, quitar y Enter', () => {
  it('las flechas mueven de a 1 y con Mayús de a 10', () => {
    expect(bajar(tecla('ArrowRight'))).toEqual({ tipo: 'mover', dx: 1, dy: 0 })
    expect(bajar(tecla('ArrowLeft'))).toEqual({ tipo: 'mover', dx: -1, dy: 0 })
    expect(bajar(tecla('ArrowUp'))).toEqual({ tipo: 'mover', dx: 0, dy: -1 })
    expect(bajar(tecla('ArrowDown', { shiftKey: true }))).toEqual({
      tipo: 'mover',
      dx: 0,
      dy: 10,
    })
    expect(bajar(tecla('ArrowLeft', { shiftKey: true }))).toEqual({
      tipo: 'mover',
      dx: -10,
      dy: 0,
    })
  })

  it('Supr y Retroceso quitan; Enter edita o termina', () => {
    expect(bajar(tecla('Delete'))).toEqual({ tipo: 'quitar' })
    expect(bajar(tecla('Backspace'))).toEqual({ tipo: 'quitar' })
    expect(bajar(tecla('Enter'))).toEqual({ tipo: 'enter' })
  })

  it('RePág y AvPág van a la página anterior y a la siguiente', () => {
    expect(bajar(tecla('PageUp'))).toEqual({ tipo: 'pagina', hacia: 'anterior' })
    expect(bajar(tecla('PageDown'))).toEqual({ tipo: 'pagina', hacia: 'siguiente' })
  })

  it('Esc no es de esta tabla (lo atiende el proveedor global)', () => {
    expect(bajar(tecla('Escape'))).toBeNull()
  })
})

describe('esCampoEditable', () => {
  const como = (destino: object) => destino as unknown as EventTarget
  it('un campo de texto, un área, un select o algo editable', () => {
    expect(esCampoEditable(como({ tagName: 'INPUT' }))).toBe(true)
    expect(esCampoEditable(como({ tagName: 'TEXTAREA' }))).toBe(true)
    expect(esCampoEditable(como({ tagName: 'SELECT' }))).toBe(true)
    expect(esCampoEditable(como({ tagName: 'DIV', isContentEditable: true }))).toBe(true)
  })

  it('un botón, un lienzo o nada no lo son', () => {
    expect(esCampoEditable(como({ tagName: 'BUTTON' }))).toBe(false)
    expect(esCampoEditable(como({ tagName: 'CANVAS', isContentEditable: false }))).toBe(false)
    expect(esCampoEditable(null)).toBe(false)
  })
})

describe('la lista de «?»', () => {
  it('cada combinación una vez, bajo «Editor de artes», con Esc y Ctrl+S', () => {
    const combinaciones = ATAJOS_DEL_EDITOR.map((a) => a.combinacion)
    expect(new Set(combinaciones).size).toBe(combinaciones.length)
    expect(combinaciones).toEqual(expect.arrayContaining(['escape', 'mod+s', ' ', 'mod+z']))
    expect(GRUPO_DE_AYUDA_DEL_EDITOR.titulo).toBe('Editor de artes')
  })
})
