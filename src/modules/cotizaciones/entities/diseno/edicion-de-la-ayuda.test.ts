import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, type AyudaDeDiseno, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import {
  devolverBloque,
  motivoParaSumar,
  moverBloque,
  ponerEnlace,
  ponerTextoDelBloque,
  quitarBloque,
  quitarEnlace,
  rechazoDelEnlace,
  sumarBloque,
  sumarEnlace,
} from './edicion-de-la-ayuda'

const juego = casos as unknown as {
  contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
  formulas: Record<string, { definicion: unknown }>
  casos: { nombre: string; diseno: unknown }[]
}
const definicion = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
const EN = { seccion: 'compra', nodo: 'remate' }
// El diseño de las capturas con la ayuda de `remate` tal cual se pasa (la de antes o bloques).
const con = (ayuda: AyudaDeDiseno | undefined): Diseno => {
  const d = esquemaDiseno.parse(juego.casos.find((c) => c.nombre.startsWith('capturas'))?.diseno)
  return congelar({
    ...d,
    secciones: d.secciones.map((s) =>
      s.id !== EN.seccion
        ? s
        : {
            ...s,
            items: s.items.map((it) =>
              it.tipo === 'celda' && it.nodo === EN.nodo
                ? { ...it, ...(ayuda === undefined ? {} : { ayuda }) }
                : it,
            ),
          },
    ),
  })
}
const ayuda = (d: Diseno) => {
  const it = d.secciones
    .find((s) => s.id === EN.seccion)
    ?.items.find((i) => i.tipo === 'celda' && i.nodo === EN.nodo)
  return it?.tipo === 'celda' ? it.ayuda : undefined
}
const valida = (d: Diseno) => validarDiseno(definicion, d, juego.contexto).ok
const bloque = (i: number) => ({ ...EN, bloque: i })

describe('los bloques de la ayuda', () => {
  it('sumar deja uno vacío al final (inválido hasta llenarlo); la ayuda de antes pasa a bloques', () => {
    const d = sumarBloque(con({ texto: 'Mira la subasta.' }), EN, 'titulo')
    expect(ayuda(d)).toEqual([
      { tipo: 'texto', texto: 'Mira la subasta.' },
      { tipo: 'titulo', texto: '' },
    ])
    expect(valida(d)).toBe(false)
    expect(valida(ponerTextoDelBloque(d, bloque(1), 'Copart'))).toBe(true)
    expect(ayuda(sumarBloque(con(undefined), EN, 'enlaces'))).toEqual([
      { tipo: 'enlaces', enlaces: [{ titulo: '', url: '' }] },
    ])
    expect(ayuda(sumarBloque(con(undefined), EN, 'tabla', 'depreciacion'))).toEqual([
      { tipo: 'tabla', tabla: 'depreciacion' },
    ])
  })

  it('el tope: 8 bloques y 3 tablas por ayuda, con su motivo; pasado el tope, sumar no hace nada', () => {
    let d = con(undefined)
    for (let i = 0; i < 3; i += 1) d = sumarBloque(d, EN, 'tabla', 'depreciacion')
    expect(motivoParaSumar(ayuda(d), 'tabla')).toBe('Hasta 3 tablas por ayuda.')
    expect(motivoParaSumar(ayuda(d), 'texto')).toBeNull()
    expect(sumarBloque(d, EN, 'tabla', 'depreciacion')).toEqual(d)
    for (let i = 0; i < 6; i += 1) d = sumarBloque(d, EN, 'texto')
    expect(ayuda(d)).toHaveLength(8)
    expect(motivoParaSumar(ayuda(d), 'titulo')).toBe('Hasta 8 bloques.')
  })

  it('el texto se corta en su tope (en caracteres): 80 el título, 1.000 el texto', () => {
    const d = sumarBloque(sumarBloque(con(undefined), EN, 'titulo'), EN, 'texto')
    const largo = ponerTextoDelBloque(
      ponerTextoDelBloque(d, bloque(0), '😀'.repeat(81)),
      bloque(1),
      'x'.repeat(1001),
    )
    expect(ayuda(largo)).toEqual([
      { tipo: 'titulo', texto: '😀'.repeat(80) },
      { tipo: 'texto', texto: 'x'.repeat(1000) },
    ])
    expect(valida(largo)).toBe(true)
  })

  it('mover lleva el bloque a su lugar; quitar el último quita la clave; devolver lo pone donde estaba', () => {
    const d = con([
      { tipo: 'titulo', texto: 'A' },
      { tipo: 'texto', texto: 'B' },
      { tipo: 'texto', texto: 'C' },
    ])
    expect(ayuda(moverBloque(d, bloque(0), 2))).toEqual([
      { tipo: 'texto', texto: 'B' },
      { tipo: 'texto', texto: 'C' },
      { tipo: 'titulo', texto: 'A' },
    ])
    expect(moverBloque(d, bloque(0), 3)).toEqual(d)
    const sin = quitarBloque(d, bloque(1))
    expect(ayuda(devolverBloque(sin, bloque(1), { tipo: 'texto', texto: 'B' }))).toEqual(ayuda(d))
    const solo = con([{ tipo: 'texto', texto: 'A' }])
    expect(ayuda(quitarBloque(solo, bloque(0)))).toBeUndefined()
  })
})

describe('los enlaces de un bloque', () => {
  const conEnlaces = () => con([{ tipo: 'enlaces', enlaces: [{ titulo: '', url: '' }] }])

  it('agregar suma uno vacío al final, hasta 5; llenarlos deja el diseño válido', () => {
    let d = ponerEnlace(
      conEnlaces(),
      { ...bloque(0), posicion: 0 },
      { titulo: 'Copart', url: 'https://www.copart.com/' },
    )
    expect(valida(d)).toBe(true)
    d = sumarEnlace(d, bloque(0))
    expect(valida(d)).toBe(false)
    for (let i = 0; i < 6; i += 1) d = sumarEnlace(d, bloque(0))
    const leida = ayuda(d)
    expect(
      Array.isArray(leida) && leida[0]?.tipo === 'enlaces' ? leida[0].enlaces : [],
    ).toHaveLength(5)
  })

  it('quitar uno lo saca; el único no se quita (se quita el bloque); otro bloque no tiene enlaces', () => {
    const d = sumarEnlace(conEnlaces(), bloque(0))
    expect(ayuda(quitarEnlace(d, { ...bloque(0), posicion: 1 }))).toEqual(ayuda(conEnlaces()))
    expect(quitarEnlace(conEnlaces(), { ...bloque(0), posicion: 0 })).toEqual(conEnlaces())
    const texto = con([{ tipo: 'texto', texto: 'A' }])
    expect(sumarEnlace(texto, bloque(0))).toEqual(texto)
  })
})

describe('rechazoDelEnlace', () => {
  it('un título vacío o largo (en caracteres) y una URL que no es https', () => {
    expect(rechazoDelEnlace({ titulo: '', url: 'https://a.com' })).toEqual({
      titulo: 'Escribe un título.',
    })
    expect(rechazoDelEnlace({ titulo: '😀'.repeat(60), url: 'https://a.com' })).toEqual({})
    expect(rechazoDelEnlace({ titulo: 'x'.repeat(61), url: 'https://a.com' })).toEqual({
      titulo: 'Hasta 60 caracteres.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'http://a.com' })).toEqual({
      url: 'Tiene que empezar con https://.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'javascript:alert(1)' })).toEqual({
      url: 'Tiene que empezar con https://.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: 'https://a.com/con espacio' })).toEqual({
      url: 'No puede llevar espacios ni tildes.',
    })
    expect(rechazoDelEnlace({ titulo: 'A', url: `https://${'a'.repeat(2000)}` })).toEqual({
      url: 'Hasta 2000 caracteres.',
    })
  })
})
