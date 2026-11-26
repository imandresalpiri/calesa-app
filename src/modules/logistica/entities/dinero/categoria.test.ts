import { describe, expect, it } from 'vitest'
import {
  borradorDeCategoria,
  BORRADOR_NUEVO_DE_CATEGORIA,
  cambiosDeCategoria,
  categoriasDesde,
  categoriasParaElegir,
  nombreDelProposito,
  PROPOSITOS_DE_CATEGORIA,
  textoDeUsoDeCategoria,
  validarCategoria,
  type BorradorDeCategoria,
  type CategoriaDeGasto,
} from './categoria'

const VERSION = '2026-11-25T12:00:00.000000+00:00'

const borrador = (p: Partial<BorradorDeCategoria> = {}): BorradorDeCategoria => ({
  nombre: 'Maniobras',
  proposito: 'otro',
  activo: true,
  orden: '10',
  ...p,
})

const errores = (b: BorradorDeCategoria) => {
  const r = validarCategoria(b)
  return r.ok ? {} : r.errores
}

describe('PROPOSITOS_DE_CATEGORIA', () => {
  // La lista la fija el `check` de `categorias_gasto.proposito` en la base: si cambia allá, cambia acá.
  it('son exactamente los seis de la base', () => {
    expect([...PROPOSITOS_DE_CATEGORIA.map((p) => p.valor)].sort()).toEqual(
      ['chaperia', 'despachante', 'flete', 'grua', 'otro', 'tributos'].sort(),
    )
  })

  it('cada uno tiene su nombre y uno desconocido o nulo se dice «Sin propósito»', () => {
    expect(nombreDelProposito('grua')).toBe('Grúa')
    expect(nombreDelProposito(null)).toBe('Sin propósito')
    expect(nombreDelProposito('inventado')).toBe('Sin propósito')
  })
})

describe('validarCategoria', () => {
  it('un nombre vacío o de sólo espacios se rechaza', () => {
    expect(errores(borrador({ nombre: '' }))['nombre']).toBe('Escribe el nombre.')
    expect(errores(borrador({ nombre: '   ' }))['nombre']).toBe('Escribe el nombre.')
  })

  it('un nombre de más de 60 letras se rechaza', () => {
    expect(errores(borrador({ nombre: 'a'.repeat(61) }))['nombre']).toMatch(/60/)
  })

  it('el orden fuera de 0 a 32767, con decimales o que no es un número se rechaza', () => {
    expect(errores(borrador({ orden: '-1' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '32768' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '1.5' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: 'abc' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '' }))['orden']).toBeDefined()
    expect(errores(borrador({ orden: '0' }))).toEqual({})
    expect(errores(borrador({ orden: '32767' }))).toEqual({})
  })

  it('un propósito que no es de la lista se rechaza; vacío es «sin propósito»', () => {
    expect(errores(borrador({ proposito: 'inventado' }))['proposito']).toBeDefined()
    const r = validarCategoria(borrador({ proposito: '' }))
    expect(r.ok && r.datos.proposito).toBe(null)
  })

  it('devuelve el nombre recortado y el orden como número', () => {
    const r = validarCategoria(borrador({ nombre: '  Maniobras  ', orden: ' 90 ' }))
    expect(r).toEqual({
      ok: true,
      datos: { nombre: 'Maniobras', proposito: 'otro', activo: true, orden: 90 },
    })
  })
})

describe('cambiosDeCategoria', () => {
  const original: CategoriaDeGasto = {
    id: '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    origenId: null,
    nombre: 'Maniobras',
    proposito: 'otro',
    activo: true,
    orden: 10,
    actualizadoEn: VERSION,
  }

  it('sin diferencias da nulo', () => {
    expect(
      cambiosDeCategoria(original, {
        nombre: 'Maniobras',
        proposito: 'otro',
        activo: true,
        orden: 10,
      }),
    ).toBeNull()
  })

  it('devuelve sólo lo que cambió', () => {
    expect(
      cambiosDeCategoria(original, {
        nombre: 'Maniobras',
        proposito: null,
        activo: false,
        orden: 10,
      }),
    ).toEqual({ proposito: null, activo: false })
  })
})

describe('categoriasDesde', () => {
  const fila = {
    id: '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    origen_id: '00000000-0000-4000-8000-00000000000a',
    nombre: 'Flete',
    proposito: 'flete',
    activo: true,
    orden: 10,
    actualizado_en: VERSION,
  }

  it('lee el origen (nulo = compartida) y la versión', () => {
    expect(categoriasDesde([fila, { ...fila, origen_id: null }])).toEqual([
      {
        id: fila.id,
        origenId: fila.origen_id,
        nombre: 'Flete',
        proposito: 'flete',
        activo: true,
        orden: 10,
        actualizadoEn: VERSION,
      },
      expect.objectContaining({ origenId: null }),
    ])
  })

  it('una fila sin versión o con un origen que no es un id no se lee', () => {
    expect(categoriasDesde([{ ...fila, actualizado_en: undefined }])).toBeNull()
    expect(categoriasDesde([{ ...fila, origen_id: 'x' }])).toBeNull()
  })
})

describe('textoDeUsoDeCategoria', () => {
  it('dice cuántos gastos la usan, «más de 50» pasado el tope', () => {
    expect(textoDeUsoDeCategoria('Flete', 3)).toBe(
      'Desactivaste «Flete»: la usan 3 gastos; siguen mostrándola.',
    )
    expect(textoDeUsoDeCategoria('Flete', 51)).toBe(
      'Desactivaste «Flete»: la usan más de 50 gastos; siguen mostrándola.',
    )
  })
})

describe('el formulario de una categoría', () => {
  it('uno nuevo nace activo y válido en cuanto se le pone nombre', () => {
    expect(validarCategoria({ ...BORRADOR_NUEVO_DE_CATEGORIA, nombre: 'Seguro' })).toEqual({
      ok: true,
      datos: { nombre: 'Seguro', proposito: null, activo: true, orden: 0 },
    })
  })

  it('uno que se edita arranca con lo guardado y sin cambios no hay nada que mandar', () => {
    const c: CategoriaDeGasto = {
      id: 'x',
      origenId: null,
      nombre: 'Flete',
      proposito: null,
      activo: false,
      orden: 3,
      actualizadoEn: VERSION,
    }
    const b = borradorDeCategoria(c)
    expect(b).toEqual({ nombre: 'Flete', proposito: '', activo: false, orden: '3' })
    const r = validarCategoria(b)
    expect(r.ok && cambiosDeCategoria(c, r.datos)).toBeNull()
  })
})

describe('categoriasParaElegir', () => {
  const A = '00000000-0000-4000-8000-00000000000a'
  const B = '00000000-0000-4000-8000-00000000000b'
  const cat = (
    id: string,
    nombre: string,
    origenId: string | null,
    p: Partial<CategoriaDeGasto> = {},
  ) => ({
    id,
    origenId,
    nombre,
    proposito: null,
    activo: true,
    orden: 10,
    actualizadoEn: VERSION,
    ...p,
  })
  const CATEGORIAS = [
    cat('flete', 'Flete', null),
    cat('grua', 'Grúa', null, { orden: 5 }),
    cat('vieja', 'Vieja', null, { activo: false }),
    cat('flete-a', 'FLETE', A),
    cat('chaperia-b', 'Chapería', B),
  ]
  const valores = (o: { valor: string }[]) => o.map((x) => x.valor)

  it('ofrece lo que usa el origen, por orden y nombre: su propia y no la compartida que tapa, ni la de otro', () => {
    expect(valores(categoriasParaElegir(CATEGORIAS, null, [A]))).toEqual(['grua', 'flete-a'])
  })

  it('con varios orígenes, sólo las compartidas que ninguno tapa; sin orígenes, las compartidas', () => {
    expect(valores(categoriasParaElegir(CATEGORIAS, null, [A, B]))).toEqual(['grua'])
    expect(valores(categoriasParaElegir(CATEGORIAS, null, []))).toEqual(['grua', 'flete'])
  })

  it('la del gasto que se corrige sigue, rotulada, aunque esté inactiva, tapada, sea de otro origen o no haya venido', () => {
    const rotulo = (id: string, nombre = '') =>
      categoriasParaElegir(CATEGORIAS, { id, nombre }, [A]).at(-1)?.etiqueta
    expect(rotulo('vieja')).toBe('Vieja (inactiva)')
    expect(rotulo('flete')).toBe('Flete (tapada)')
    expect(rotulo('chaperia-b')).toBe('Chapería (de otro origen)')
    expect(rotulo('otra', 'Maniobras')).toBe('Maniobras (de otro origen)')
    expect(categoriasParaElegir(CATEGORIAS, { id: 'grua', nombre: 'Grúa' }, [A])).toHaveLength(2)
  })
})
