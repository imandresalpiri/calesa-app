import { describe, expect, it } from 'vitest'
import {
  clienteDeLaCabecera,
  LEAD_SIN_NOMBRE,
  textoDelCliente,
  CLIENTE_QUE_NO_PUEDES_VER,
  type LeadDeLaCabecera,
} from './cliente-de-la-cabecera'

const LEAD = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const numeros = { numero: 120, numeroPropio: null, creadorDelPropio: null }
const lead: LeadDeLaCabecera = { id: LEAD, nombre: 'Ana Pérez', numeros, enCartera: false }

describe('clienteDeLaCabecera', () => {
  it('con un lead que se ve, el lead (con sus números y si está en la cartera)', () => {
    expect(clienteDeLaCabecera({ leadId: LEAD, clienteNombre: null, lead })).toEqual({
      tipo: 'lead',
      id: LEAD,
      nombre: 'Ana Pérez',
      numeros,
      enCartera: false,
    })
  })

  it('manda el lead aunque el proyecto tenga también un nombre escrito', () => {
    expect(clienteDeLaCabecera({ leadId: LEAD, clienteNombre: 'Taller', lead }).tipo).toBe('lead')
  })

  it('un lead que no se ve (o no se leyó) es «oculto» y no deja ver el nombre escrito', () => {
    expect(clienteDeLaCabecera({ leadId: LEAD, clienteNombre: 'Taller', lead: null })).toEqual({
      tipo: 'oculto',
    })
  })

  it('un lead leído con otro id es «oculto»', () => {
    expect(clienteDeLaCabecera({ leadId: OTRO, clienteNombre: null, lead })).toEqual({
      tipo: 'oculto',
    })
  })

  it('un nombre de lead vacío se escribe «Sin nombre»', () => {
    const cliente = clienteDeLaCabecera({
      leadId: LEAD,
      clienteNombre: null,
      lead: { ...lead, nombre: '  ' },
    })
    expect(cliente).toMatchObject({ tipo: 'lead', nombre: LEAD_SIN_NOMBRE })
  })

  it('sin lead, el nombre escrito a mano (recortado); sin nada, «ninguno»', () => {
    expect(clienteDeLaCabecera({ leadId: null, clienteNombre: ' Taller ', lead: null })).toEqual({
      tipo: 'libre',
      nombre: 'Taller',
    })
    expect(clienteDeLaCabecera({ leadId: null, clienteNombre: '   ', lead: null })).toEqual({
      tipo: 'ninguno',
    })
    expect(clienteDeLaCabecera({ leadId: null, clienteNombre: null, lead })).toEqual({
      tipo: 'ninguno',
    })
  })
})

describe('textoDelCliente', () => {
  it('el lead va con su ficha; lo demás, sin enlace', () => {
    expect(
      textoDelCliente({ tipo: 'lead', id: LEAD, nombre: 'Ana Pérez', numeros, enCartera: true }),
    ).toEqual({
      texto: 'Ana Pérez',
      href: `/leads/${LEAD}`,
    })
    expect(textoDelCliente({ tipo: 'oculto' })).toEqual({
      texto: CLIENTE_QUE_NO_PUEDES_VER,
      href: null,
    })
    expect(textoDelCliente({ tipo: 'libre', nombre: 'Luis' })).toEqual({
      texto: 'Luis',
      href: null,
    })
    expect(textoDelCliente({ tipo: 'ninguno' })).toEqual({ texto: '—', href: null })
  })
})
