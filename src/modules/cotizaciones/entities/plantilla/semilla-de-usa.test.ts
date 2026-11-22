import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  CONTEXTO,
  plantillaDeLaSemilla,
  plantillaV1DeLaSemilla,
  sembrada,
} from '../semilla-lectura'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { ContextoDeNodos, DefinicionParaPlantilla } from './nodos-de-plantilla'
import { validarPlantilla } from './validar-plantilla'

// La tarjeta sembrada de USA: forma 2, la conversión de su forma 1 (el fixture `plantillas-v1-de-las-semillas.json`) salvo la leyenda de la transferencia,
// que es un texto con datos: «Comisión giro » y el porcentaje de cada cotización. Todo del nivel «todos», como en `convertir-plantilla.test.ts`: con la
// visibilidad compilada de verdad lo prueba la base (`semilla-cotizador.sql` y T5 de `areas/tarjeta/plantilla-convertir.sql`).
const LEYENDA = 'c_n_transferencia_leyenda'

const conLaLeyenda = (p: PlantillaEnCuadricula, contenido: unknown) => ({
  ...p,
  celdas: p.celdas.map((c) => (c.id === LEYENDA ? { ...c, contenido } : c)),
})

describe.each(['subasta_usa', 'planilla_usa'] as const)('la tarjeta sembrada de %s', (clave) => {
  const s = sembrada(clave)
  const definicion = s.definicion as DefinicionParaPlantilla
  const contexto: ContextoDeNodos = {
    definicion,
    diseno: s.diseno as ContextoDeNodos['diseno'],
    visibilidad: Object.fromEntries((definicion.nodos ?? []).map((n) => [n.id, { ver: 'todos' }])),
  }
  const tarjeta = plantillaDeLaSemilla(clave) as PlantillaEnCuadricula

  it('es forma 2, cabe en los 24 KiB y valida contra su fórmula', () => {
    expect(tarjeta.forma).toBe(2)
    const r = validarPlantilla(tarjeta, { ...contexto, tonos: CONTEXTO.tonos })
    expect(r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`).toBe('válida')
  })

  it('lleva «Comisión giro » y el porcentaje de la transferencia en la leyenda', () => {
    expect(tarjeta.celdas.find((c) => c.id === LEYENDA)?.contenido).toEqual({
      tipo: 'texto',
      partes: ['Comisión giro ', { tipo: 'dato', nodo: 'transferencia', mostrar: 'porcentaje' }],
    })
  })

  it('es su forma 1 convertida, salvo la leyenda, que allí es la descripción de la transferencia', () => {
    const convertida = convertirPlantilla(
      plantillaV1DeLaSemilla(clave) as Plantilla,
      contexto,
      CONTEXTO.tonos,
    )
    const original = convertida.celdas.find((c) => c.id === LEYENDA)?.contenido
    expect(original).toEqual({ tipo: 'dato', nodo: 'transferencia', mostrar: 'descripcion' })
    expect(conLaLeyenda(tarjeta, original)).toEqual(convertida)
  })
})
