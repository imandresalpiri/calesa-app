import { describe, expect, it } from 'vitest'
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { plantillaV1DeLaSemilla, sembrada, SEMILLAS, type Clave } from '../semilla-lectura'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { ContextoDeNodos, DefinicionParaPlantilla } from './nodos-de-plantilla'
import { validarPlantilla } from './validar-plantilla'

// La semántica de la conversión sobre la forma 1 de cada semilla (`plantillaV1DeLaSemilla()`: la de USA, del fixture; la de oficina, sembrada): las mismas filas
// por grupo con su color, el título del grupo que abarca a sus miembros, cada miembro con `no_aplica`, el total, lo aparte, la nota y el logo. El espejo exacto
// con la base es el juego `casos-de-conversion.json`; que lo convertido valide contra la visibilidad compilada de verdad, T2 de `plantilla-convertir.sql`.
const TONOS = ['verde', 'amarillo', 'naranja']

const plantillaSembrada = (clave: Clave) => plantillaV1DeLaSemilla(clave) as Plantilla

// Todo del nivel «todos»: la regla de qué viaja la prueba la base; aquí, la forma.
function contextoDe(clave: Clave): ContextoDeNodos {
  const s = sembrada(clave)
  const definicion = s.definicion as DefinicionParaPlantilla
  return {
    definicion,
    diseno: s.diseno as ContextoDeNodos['diseno'],
    visibilidad: Object.fromEntries((definicion.nodos ?? []).map((n) => [n.id, { ver: 'todos' }])),
  }
}

const celdasDe = (p: PlantillaEnCuadricula, fila: string): CeldaDeLaTarjeta[] =>
  p.celdas.filter((c) => c.fila === fila)

describe.each(Object.keys(SEMILLAS) as Clave[])(
  'convertirPlantilla de la semilla de %s',
  (clave) => {
    const plantilla = plantillaSembrada(clave)
    const contexto = contextoDe(clave)
    const p = convertirPlantilla(plantilla, contexto, TONOS)

    it('da una cuadrícula válida contra su fórmula (sin el tope) y es determinista', () => {
      const r = validarPlantilla(p, { ...contexto, tonos: TONOS }, { conTope: false })
      expect(r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`).toBe('válida')
      expect(convertirPlantilla(plantilla, contexto, TONOS)).toEqual(p)
    })

    it('cada miembro de cada grupo es una fila que se oculta si no aplica, en el orden de la fórmula y con el color de su grupo', () => {
      const nodos = contexto.definicion.nodos ?? []
      for (const g of plantilla.grupos) {
        const miembros = nodos.filter((n) => n.grupo === g.grupo).map((n) => n.id)
        const filas = p.filas.filter((f) => f.nodo !== undefined && miembros.includes(f.nodo))
        expect(filas.map((f) => f.nodo)).toEqual(miembros)
        expect(filas.every((f) => f.ocultar_si === 'no_aplica')).toBe(true)
        const [primera] = filas
        if (primera === undefined) continue
        const titulo = celdasDe(p, primera.id).find((c) => c.columna === 'grupo')
        expect(titulo?.abarca_filas ?? 1).toBe(miembros.length)
        expect(titulo?.estilo?.fondo).toBe(g.tono)
        expect(titulo?.estilo?.alinear_vertical).toBe('arriba')
      }
    })

    it('el total con su etiqueta y el monto del nodo del total; lo aparte con su etiqueta escrita; la nota y el logo', () => {
      const total = celdasDe(p, 'total')
      expect(total[0]?.contenido).toEqual({ tipo: 'texto', texto: plantilla.total.etiqueta })
      expect(total[1]?.contenido).toEqual({ tipo: 'dato', nodo: 'total', mostrar: 'monto' })
      for (const s of contexto.diseno?.tarjeta_total?.secundarios ?? []) {
        const fila = p.filas.find((f) => f.id === `a_${s}`)
        expect(fila?.ocultar_si).toBe('no_aplica')
      }
      expect(p.filas.some((f) => f.id === 'nota')).toBe(Boolean(plantilla.nota))
      expect(p.celdas.filter((c) => c.contenido.tipo === 'logo')).toHaveLength(
        plantilla.logo ? 1 : 0,
      )
    })
  },
)

describe('convertirPlantilla', () => {
  const plantilla = plantillaSembrada('subasta_usa')
  const contexto = contextoDe('subasta_usa')

  it('subasta_usa: las seis columnas, el título de la opción y el logo al costado del encabezado', () => {
    const p = convertirPlantilla(plantilla, contexto, TONOS)
    expect(p.columnas.map((c) => c.id)).toEqual([
      'grupo',
      'concepto',
      'monto',
      'leyenda',
      'tipo_cambio',
      'plazo',
    ])
    expect(p.filas.slice(0, 6).map((f) => f.id)).toEqual([
      'titulo',
      'fecha',
      'numero',
      'asesor',
      'vehiculo',
      'cabecera',
    ])
    expect(p.celdas.find((c) => c.id === 'c_logo')).toMatchObject({
      fila: 'titulo',
      columna: 'plazo',
      abarca_filas: 4,
    })
    const etiqueta = p.celdas.find((c) => c.id === 'c_a_garantia_grupo')
    expect(etiqueta?.contenido).toEqual({ tipo: 'texto', texto: 'GARANTÍA PARA LA PARTICIPACIÓN' })
  })

  it('un color que ya no está en el catálogo cae al del grupo; sin ninguno, la celda va sin fondo', () => {
    const conAzul = { ...plantilla, grupos: plantilla.grupos.map((g) => ({ ...g, tono: 'azul' })) }
    const p = convertirPlantilla(conAzul, contexto, TONOS)
    expect(p.celdas.find((c) => c.id === 'c_n_remate_monto')?.estilo?.fondo).toBe('verde')
    const sinCatalogo = convertirPlantilla(conAzul, contexto, [])
    expect(sinCatalogo.celdas.find((c) => c.id === 'c_n_remate_monto')?.estilo).not.toHaveProperty(
      'fondo',
    )
  })

  it('sin la variante del nivel «todos» no hay fila del título', () => {
    const p = convertirPlantilla(
      plantilla,
      { ...contexto, visibilidad: { ...contexto.visibilidad, variante: { ver: 'costos' } } },
      TONOS,
    )
    expect(p.filas[0]?.id).toBe('fecha')
  })
})
