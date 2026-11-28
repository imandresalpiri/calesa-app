import { describe, expect, it } from 'vitest'
import {
  datosDelEjemploElegido,
  gruposDeLeadsDelEjemplo,
  leadAlCambiarDeCotizacion,
  leadPreferido,
  leadsDelEjemplo,
  textoDelEjemploElegido,
} from './ejemplo-con-datos'
import type { CotizacionDeEjemplo, LeadsDeEjemplo, VehiculoDeEjemplo } from './respuestas'
import type { FijosDelArte } from './tipos'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ana = { leadId: ID(1), nombre: 'Ana' }
const beto = { leadId: ID(2), nombre: 'Beto' }
const caro = { leadId: ID(3), nombre: 'Caro' }

const LEADS: LeadsDeEjemplo = {
  grupos: [
    { tipo: 'vinculado', leads: [ana] },
    { tipo: 'interesado', leads: [beto, ana] },
    { tipo: 'cotizado', leads: [caro] },
  ],
}

describe('leadsDelEjemplo', () => {
  it('junta los grupos en su orden sin repetir', () => {
    expect(leadsDelEjemplo(LEADS).map((l) => l.nombre)).toEqual(['Ana', 'Beto', 'Caro'])
  })

  it('con un motivo no hay leads', () => {
    expect(leadsDelEjemplo({ motivo: 'Oculto en Modo Live' })).toEqual([])
  })
})

describe('leadPreferido', () => {
  it('prefiere el recordado, luego el de la cotización, luego el vinculado', () => {
    expect(leadPreferido(LEADS, { recordado: ID(3), deLaCotizacion: ID(2) })).toEqual(caro)
    expect(leadPreferido(LEADS, { recordado: ID(9), deLaCotizacion: ID(2) })).toEqual(beto)
    expect(leadPreferido(LEADS, { recordado: null, deLaCotizacion: ID(9) })).toEqual(ana)
  })

  it('sin vinculado ni coincidencias, ninguno', () => {
    const sinVinculado: LeadsDeEjemplo = { grupos: [{ tipo: 'interesado', leads: [beto] }] }
    expect(leadPreferido(sinVinculado, { recordado: null, deLaCotizacion: null })).toBeNull()
    expect(leadPreferido({ motivo: 'x' }, { recordado: ID(1), deLaCotizacion: ID(1) })).toBeNull()
  })
})

describe('leadAlCambiarDeCotizacion', () => {
  it('toma el de la cotización si está entre los relacionados; si no, deja el que estaba', () => {
    expect(leadAlCambiarDeCotizacion(LEADS, ana, ID(3))).toEqual(caro)
    expect(leadAlCambiarDeCotizacion(LEADS, ana, ID(9))).toEqual(ana)
    expect(leadAlCambiarDeCotizacion(LEADS, null, null)).toBeNull()
  })
})

describe('datosDelEjemploElegido', () => {
  const fijos: FijosDelArte = {
    asesor: null,
    empresa: { nombre: 'Calesa', web: null, redes: {}, zona: 'America/La_Paz', locale: 'es-BO' },
  }
  const vehiculo = { vehiculo: { id: ID(5) }, leads: LEADS } as unknown as VehiculoDeEjemplo

  it('todo es real: sin cotización ni asesor, faltan', () => {
    const datos = datosDelEjemploElegido({ vehiculo, cotizacion: null, lead: beto }, fijos)
    expect(datos).toMatchObject({
      deEjemplo: false,
      cotizacion: null,
      lead: { nombre: 'Beto' },
      asesor: null,
    })
    expect(datos.vehiculo?.id).toBe(ID(5))
  })
})

describe('textoDelEjemploElegido', () => {
  const vehiculo = {
    vehiculo: { titulo: 'Toyota Hilux 2019' },
    leads: LEADS,
  } as unknown as VehiculoDeEjemplo
  const cotizacion = { cotizacion: { numero: 42 }, leadId: null } as unknown as CotizacionDeEjemplo

  it('sin nada elegido, los datos de ejemplo; con vehículo, su título y el número de la cotización', () => {
    expect(textoDelEjemploElegido(null)).toBe('Datos de ejemplo')
    expect(textoDelEjemploElegido({ vehiculo, cotizacion: null, lead: null })).toBe(
      'Vehículo de ejemplo: Toyota Hilux 2019',
    )
    expect(textoDelEjemploElegido({ vehiculo, cotizacion, lead: null })).toBe(
      'Vehículo de ejemplo: Toyota Hilux 2019 · n.º 42',
    )
  })
})

describe('gruposDeLeadsDelEjemplo', () => {
  it('cada lead en el primer grupo donde sale; sin los grupos vacíos', () => {
    expect(gruposDeLeadsDelEjemplo(LEADS)).toEqual([
      { titulo: 'Vinculado', leads: [ana] },
      { titulo: 'Interesados', leads: [beto] },
      { titulo: 'Cotizados', leads: [caro] },
    ])
    const repetidos: LeadsDeEjemplo = {
      grupos: [
        { tipo: 'vinculado', leads: [] },
        { tipo: 'interesado', leads: [ana] },
        { tipo: 'cotizado', leads: [ana] },
      ],
    }
    expect(gruposDeLeadsDelEjemplo(repetidos)).toEqual([{ titulo: 'Interesados', leads: [ana] }])
  })

  it('con un motivo no hay grupos', () => {
    expect(gruposDeLeadsDelEjemplo({ motivo: 'Oculto en Modo Live' })).toEqual([])
  })
})
