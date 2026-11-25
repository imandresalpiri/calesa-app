import { describe, expect, it } from 'vitest'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import type { FilaEditable } from './edicion'
import {
  abrirEdicion,
  abrirElRechazo,
  aplicarFila,
  cancelarFila,
  editarFila,
  errorDeLaEdicion,
  hayCambiosEnLaAyuda,
  publicables,
  quitar,
  sumarAlFinal,
  tablaCambio,
  volver,
} from './edicion-en-la-ayuda'
import { TOPE_DE_FILAS } from './validacion'

const COLUMNAS: ColumnaDeTabla[] = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto' },
  { clave: 'iva', etiqueta: 'IVA', tipo: 'numero' },
]
// Las de la tabla viva: el bloque no muestra la nota, pero la tabla la tiene.
const DE_LA_TABLA: ColumnaDeTabla[] = [
  ...COLUMNAS,
  { clave: 'nota', etiqueta: 'Nota', tipo: 'texto' },
]
const LEIDAS: FilaEditable[] = [
  { id: 'a', valores: { tipo: 'Sedán', iva: 0.1494, nota: 'x' } },
  { id: 'b', valores: { tipo: 'Camioneta', iva: 0.2 } },
]

describe('editar una tabla desde la ayuda', () => {
  it('recién abierta no tiene cambios ni fila abierta', () => {
    const e = abrirEdicion(LEIDAS)
    expect(hayCambiosEnLaAyuda(e)).toBe(false)
    expect(e.editando).toBeNull()
  })

  it('«Listo» aplica lo tipeado y conserva las columnas que el bloque no muestra', () => {
    const e = aplicarFila(editarFila(abrirEdicion(LEIDAS), 'a'), COLUMNAS, { iva: '0,15' }, 'es-BO')
    expect(e.editando).toBeNull()
    expect(e.estado.filas[0]?.valores).toStrictEqual({ tipo: 'Sedán', iva: 0.15, nota: 'x' })
    expect(hayCambiosEnLaAyuda(e)).toBe(true)
  })

  it('lo que no se lee queda como crudo y la fila sigue abierta; el error apaga «Guardar»', () => {
    const e = aplicarFila(editarFila(abrirEdicion(LEIDAS), 'b'), COLUMNAS, { iva: 'abc' }, 'es-BO')
    expect(e.editando).toBe('b')
    expect(e.estado.crudos['b']?.['iva']?.texto).toBe('abc')
    expect(errorDeLaEdicion(DE_LA_TABLA, e)?.filaId).toBe('b')
    expect(errorDeLaEdicion(DE_LA_TABLA, abrirEdicion(LEIDAS))).toBeNull()
  })

  it('🗑 tacha la fila, no la publica y «Volver» la devuelve', () => {
    const quitada = quitar(editarFila(abrirEdicion(LEIDAS), 'a'), 'a')
    expect(quitada.editando).toBeNull()
    expect(publicables(quitada).filas.map((f) => f.id)).toStrictEqual(['b'])
    expect(quitada.estado.filas).toHaveLength(2)
    expect(hayCambiosEnLaAyuda(quitada)).toBe(true)
    expect(hayCambiosEnLaAyuda(volver(quitada, 'a'))).toBe(false)
  })

  it('«+ Añadir fila» suma una vacía abierta al final; «Cancelar» la saca si sigue vacía', () => {
    const sumada = sumarAlFinal(abrirEdicion(LEIDAS), 'n')
    if (!sumada.ok) throw new Error('no sumó')
    expect(sumada.data.editando).toBe('n')
    expect(sumada.data.estado.filas.at(-1)).toStrictEqual({ id: 'n', valores: {} })
    expect(cancelarFila(sumada.data).estado.filas).toHaveLength(2)
    const llena = aplicarFila(sumada.data, COLUMNAS, { tipo: 'Moto' }, 'es-BO')
    expect(cancelarFila(editarFila(llena, 'n')).estado.filas).toHaveLength(3)
  })

  it('«Cancelar» en una fila leída la cierra sin tocarla y sin lo que no se leyó', () => {
    const e = cancelarFila(editarFila(abrirEdicion(LEIDAS), 'a'))
    expect(e.editando).toBeNull()
    expect(e.estado.filas).toStrictEqual(LEIDAS)
    const conCrudo = aplicarFila(
      editarFila(abrirEdicion(LEIDAS), 'b'),
      COLUMNAS,
      { iva: 'x' },
      'es-BO',
    )
    const cancelada = cancelarFila(conCrudo)
    expect(cancelada.estado.crudos['b']).toBeUndefined()
    expect(hayCambiosEnLaAyuda(cancelada)).toBe(false)
  })

  it('con la tabla en el tope no suma', () => {
    const llenas = Array.from({ length: TOPE_DE_FILAS }, (_, i) => ({
      id: String(i),
      valores: {},
    }))
    expect(sumarAlFinal(abrirEdicion(llenas), 'n').ok).toBe(false)
  })

  it('el rechazo de la base nombra la fila publicada (sin las quitadas) y la abre', () => {
    const e = quitar(abrirEdicion(LEIDAS), 'a')
    const abierto = abrirElRechazo(e, COLUMNAS, { camino: 'filas.0.iva', mensaje: 'Mal.' })
    expect(abierto?.edicion.editando).toBe('b')
    expect(abierto?.rechazo).toStrictEqual({ filaId: 'b', clave: 'iva', mensaje: 'Mal.' })
    expect(abrirElRechazo(e, COLUMNAS, { camino: 'filas', mensaje: 'Tope.' })).toBeNull()
  })
})

describe('tablaCambio: la viva contra la que mostraba la hoja', () => {
  const mostradas = [
    { tipo: 'Sedán', iva: 0.1494 },
    { tipo: 'Camioneta', iva: 0.2 },
  ]

  it('las mismas filas en las columnas del bloque no cambiaron (las demás no cuentan)', () => {
    expect(tablaCambio(mostradas, LEIDAS, ['tipo', 'iva'])).toBe(false)
  })

  it('otro valor, otro largo u otro orden, sí', () => {
    expect(tablaCambio([{ tipo: 'Sedán', iva: 0.15 }, mostradas[1] ?? {}], LEIDAS, ['iva'])).toBe(
      true,
    )
    expect(tablaCambio(mostradas.slice(0, 1), LEIDAS, ['iva'])).toBe(true)
    expect(tablaCambio([...mostradas].reverse(), LEIDAS, ['tipo'])).toBe(true)
  })

  it('con la lectura de la hoja cortada, sólo cuentan las que mostraba', () => {
    expect(tablaCambio(mostradas.slice(0, 1), LEIDAS, ['iva'], true)).toBe(false)
    expect(tablaCambio([{ tipo: 'Moto', iva: 0.1494 }], LEIDAS, ['tipo'], true)).toBe(true)
    expect(tablaCambio([...mostradas, { iva: 1 }], LEIDAS, ['iva'], true)).toBe(true)
  })
})
