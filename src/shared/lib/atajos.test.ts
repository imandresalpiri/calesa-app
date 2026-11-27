import { describe, expect, it } from 'vitest'
import {
  ATAJOS,
  atajoDe,
  atajosDeLaPantalla,
  combinacionDe,
  esMac,
  teclasDeLaCombinacion,
  teclasDelAtajo,
  valeMientrasSeEscribe,
  type ClaveAtajo,
  type Tecla,
} from './atajos'

function tecla(key: string, extra: Partial<Tecla> = {}): Tecla {
  return { key, ctrlKey: false, metaKey: false, altKey: false, ...extra }
}

describe('combinacionDe', () => {
  it('trata Ctrl y Cmd como el mismo modificador', () => {
    expect(combinacionDe(tecla('k', { ctrlKey: true }))).toBe('mod+k')
    expect(combinacionDe(tecla('K', { metaKey: true }))).toBe('mod+k')
  })

  it('pasa la tecla a minúsculas', () => {
    expect(combinacionDe(tecla('Escape'))).toBe('escape')
    expect(combinacionDe(tecla('N'))).toBe('n')
  })

  it('Mayús cuenta con una letra suelta, no con `?` ni con Ctrl', () => {
    expect(combinacionDe(tecla('N', { shiftKey: true }))).toBe('shift+n')
    expect(combinacionDe(tecla('?', { shiftKey: true }))).toBe('?')
    expect(combinacionDe(tecla('S', { ctrlKey: true, shiftKey: true }))).toBe('mod+s')
  })
})

describe('combinacionDe con Alt', () => {
  it('toma la letra de la tecla física: Option+M en macOS escribe «µ» y sigue siendo alt+m', () => {
    expect(combinacionDe(tecla('µ', { code: 'KeyM', altKey: true }))).toBe('alt+m')
    expect(combinacionDe(tecla('Dead', { code: 'KeyR', altKey: true }))).toBe('alt+r')
  })

  it('Mayús cuenta con Alt y una letra', () => {
    expect(combinacionDe(tecla('R', { code: 'KeyR', altKey: true, shiftKey: true }))).toBe(
      'alt+shift+r',
    )
  })

  it('sin Alt, el `code` no manda: el teclado del usuario sí', () => {
    expect(combinacionDe(tecla('n', { code: 'KeyM' }))).toBe('n')
  })
})

describe('atajoDe', () => {
  it('reconoce los atajos del catálogo', () => {
    expect(atajoDe(tecla('Escape'))).toBe('cerrar')
    expect(atajoDe(tecla('k', { metaKey: true }))).toBe('buscar')
    expect(atajoDe(tecla('n'))).toBe('nuevo')
    expect(atajoDe(tecla('N', { shiftKey: true }))).toBe('abrirNuevo')
    expect(atajoDe(tecla('?', { shiftKey: true }))).toBe('ayuda')
    expect(atajoDe(tecla('Enter', { ctrlKey: true }))).toBe('guardarYSeguir')
    expect(atajoDe(tecla('b', { ctrlKey: true }))).toBe('plegarMenu')
    expect(atajoDe(tecla('B', { metaKey: true }))).toBe('plegarMenu')
  })

  it('reconoce los de la tarjeta, sólo con Alt', () => {
    expect(atajoDe(tecla('m', { code: 'KeyM', altKey: true }))).toBe('combinarCeldas')
    expect(atajoDe(tecla('u', { code: 'KeyU', altKey: true }))).toBe('separarCeldas')
    expect(atajoDe(tecla('r', { code: 'KeyR', altKey: true }))).toBe('insertarFilaAbajo')
    expect(atajoDe(tecla('R', { code: 'KeyR', altKey: true, shiftKey: true }))).toBe(
      'insertarFilaArriba',
    )
    expect(atajoDe(tecla('c', { code: 'KeyC', altKey: true }))).toBe('insertarColumnaDerecha')
    expect(atajoDe(tecla('C', { code: 'KeyC', altKey: true, shiftKey: true }))).toBe(
      'insertarColumnaIzquierda',
    )
    expect(atajoDe(tecla('m', { code: 'KeyM' }))).toBeNull()
  })

  it('devuelve null para lo que no es un atajo', () => {
    expect(atajoDe(tecla('k'))).toBeNull()
    expect(atajoDe(tecla('n', { ctrlKey: true }))).toBeNull()
    expect(atajoDe(tecla('n', { altKey: true }))).toBeNull()
  })
})

describe('valeMientrasSeEscribe', () => {
  it('deja pasar Esc y los que llevan modificador', () => {
    expect(valeMientrasSeEscribe('cerrar')).toBe(true)
    expect(valeMientrasSeEscribe('buscar')).toBe(true)
    expect(valeMientrasSeEscribe('guardar')).toBe(true)
  })

  it('frena Ctrl+B: en un campo enriquecido es la negrita', () => {
    expect(valeMientrasSeEscribe('plegarMenu')).toBe(false)
  })

  it('frena los de una sola tecla', () => {
    expect(valeMientrasSeEscribe('nuevo')).toBe(false)
    expect(valeMientrasSeEscribe('ayuda')).toBe(false)
  })
})

describe('teclasDeLaCombinacion', () => {
  it('escribe Alt como ⌥ en macOS y Mayús aparte', () => {
    expect(teclasDeLaCombinacion('alt+shift+r', { mac: false })).toEqual(['Alt', 'Mayús', 'R'])
    expect(teclasDeLaCombinacion('alt+shift+r', { mac: true })).toEqual(['⌥', 'Mayús', 'R'])
    expect(teclasDeLaCombinacion('mod+z', { mac: true })).toEqual(['⌘', 'Z'])
    expect(teclasDeLaCombinacion('shift+ ', { mac: false })).toEqual(['Mayús', 'Espacio'])
  })
})

describe('atajosDeLaPantalla', () => {
  it('lista los de la tarjeta y ninguno más', () => {
    const combinaciones = atajosDeLaPantalla('tarjeta').map((a) => a.combinacion)
    expect(combinaciones).toEqual([
      'alt+m',
      'alt+u',
      'alt+r',
      'alt+shift+r',
      'alt+c',
      'alt+shift+c',
    ])
    expect(atajosDeLaPantalla('otra')).toEqual([])
  })

  it('ninguno choca con otro del catálogo ni con Ctrl o Cmd', () => {
    const todas = (Object.keys(ATAJOS) as ClaveAtajo[]).map((c) => ATAJOS[c].combinacion)
    expect(new Set(todas).size).toBe(todas.length)
    expect(atajosDeLaPantalla('tarjeta').every((a) => a.combinacion.startsWith('alt+'))).toBe(true)
  })
})

describe('esMac', () => {
  it('reconoce las plataformas de Apple', () => {
    expect(esMac('MacIntel')).toBe(true)
    expect(esMac('iPhone')).toBe(true)
    expect(esMac('Linux x86_64')).toBe(false)
    expect(esMac('Win32')).toBe(false)
  })
})

describe('teclasDelAtajo', () => {
  it('nombra las teclas de los atajos del catálogo', () => {
    expect(teclasDelAtajo('buscar', { mac: false })).toEqual(['Ctrl', 'K'])
    expect(teclasDelAtajo('buscar', { mac: true })).toEqual(['⌘', 'K'])
    expect(teclasDelAtajo('guardarYSeguir', { mac: false })).toEqual(['Ctrl', 'Intro'])
    expect(teclasDelAtajo('cerrar', { mac: false })).toEqual(['Esc'])
    expect(teclasDelAtajo('nuevo', { mac: false })).toEqual(['N'])
    expect(teclasDelAtajo('abrirNuevo', { mac: false })).toEqual(['Mayús', 'N'])
    expect(teclasDelAtajo('ayuda', { mac: false })).toEqual(['?'])
  })

  it('todo atajo del catálogo tiene teclas que mostrar', () => {
    for (const clave of Object.keys(ATAJOS) as ClaveAtajo[]) {
      const teclas = teclasDelAtajo(clave, { mac: false })
      expect(teclas.length).toBeGreaterThan(0)
      expect(teclas.every((t) => t.length > 0)).toBe(true)
    }
  })
})
