import { describe, expect, it } from 'vitest'
import type { EstadoDelLive } from '@/modules/equipo'
import type { RelacionadosDelVehiculo } from '@/modules/vehiculos'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import {
  clientesEnElLive,
  leadsDeEjemplo,
  leeLosLeads,
  MOTIVO_OCULTO_EN_EL_LIVE,
  MOTIVO_SIN_LEADS,
  type ClientesEnElLive,
} from './lead-de-ejemplo'

type Ajustes = Extract<EstadoDelLive, { encendido: true }>['ajustes']
type Grupos = RelacionadosDelVehiculo['grupos']
type Grupo = NonNullable<Grupos['cotizado']>

const SIN_LIVE: EstadoDelLive = { encendido: false, puedeEncender: true }
const conLive = (clientes: ClientesEnElLive, nombresDeClientes = false): EstadoDelLive => ({
  encendido: true,
  puedeEncender: true,
  nombresDeClientes,
  ajustes: { clientes } as Ajustes,
})
const CON_LEADS: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]
const SIN_PERMISOS: Permisos = []

// Los números de cada lead: ninguno puede salir de acá.
const NUMERO = 987654321
const NUMERO_PROPIO = 7777
const lead = (i: number, nombre = `Cliente ${String(i)}`) => ({
  contraparte: {
    leadId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    nombre,
    numeros: { numero: NUMERO, numeroPropio: NUMERO_PROPIO, creadorDelPropio: 'Teo' },
    enCartera: true,
    puedoActuar: true,
  },
  detalle: { tipo: 'vinculado' as const, desde: null },
})
const grupo = (tipo: Grupo['tipo'], filas: Grupo['filas']): Grupo => ({
  tipo,
  filas,
  conteo: { n: filas.length, hayMas: false },
  ocultos: 0,
  hayMas: false,
})
const relacionados = (cotizado: Grupo | null = grupo('cotizado', [lead(5)])) => ({
  grupos: {
    vinculado: grupo('vinculado', [lead(1)]),
    interesado: grupo('interesado', [lead(2), lead(3, '  '), lead(2), lead(4, ' Rosa ')]),
    cotizado,
  } satisfies Grupos,
})

describe('clientesEnElLive y leeLosLeads', () => {
  it('sin el Live, como «Completo»: lee quien tiene `leads.ver`', () => {
    expect(clientesEnElLive(SIN_LIVE)).toBe('completo')
    expect(leeLosLeads({ permisos: CON_LEADS, live: SIN_LIVE })).toBe(true)
    expect(leeLosLeads({ permisos: SIN_PERMISOS, live: SIN_LIVE })).toBe(false)
  })

  it('con los clientes apagados nadie los lee; con «Sólo nombres», si los permisos reales los ven', () => {
    expect(leeLosLeads({ permisos: CON_LEADS, live: conLive('apagado', true) })).toBe(false)
    // Con «Sólo nombres» los permisos del Live llegan sin `leads.ver`: decide `nombresDeClientes`.
    expect(leeLosLeads({ permisos: SIN_PERMISOS, live: conLive('nombres', true) })).toBe(true)
    expect(leeLosLeads({ permisos: SIN_PERMISOS, live: conLive('nombres', false) })).toBe(false)
    expect(leeLosLeads({ permisos: CON_LEADS, live: conLive('completo') })).toBe(true)
  })
})

describe('leadsDeEjemplo', () => {
  it('los grupos en su orden, cada lead con su id y su nombre, sin repetir en el grupo ni nombrar a quien no tiene nombre', () => {
    expect(leadsDeEjemplo(relacionados(), 'completo')).toEqual({
      grupos: [
        { tipo: 'vinculado', leads: [{ leadId: lead(1).contraparte.leadId, nombre: 'Cliente 1' }] },
        {
          tipo: 'interesado',
          leads: [
            { leadId: lead(2).contraparte.leadId, nombre: 'Cliente 2' },
            { leadId: lead(4).contraparte.leadId, nombre: 'Rosa' },
          ],
        },
        { tipo: 'cotizado', leads: [{ leadId: lead(5).contraparte.leadId, nombre: 'Cliente 5' }] },
      ],
    })
  })

  it('nunca sale un número ni otro dato del lead', () => {
    const json = JSON.stringify(leadsDeEjemplo(relacionados(), 'nombres'))
    expect(json).not.toContain(String(NUMERO))
    expect(json).not.toContain(String(NUMERO_PROPIO))
    expect(json).not.toMatch(/numero|Teo|enCartera|puedoActuar/)
  })

  it('sin el grupo «Cotizado» (sin `cotizaciones.ver`), los otros dos; cada grupo, hasta `TAMANO_DE_VER_MAS`', () => {
    const muchos = grupo(
      'vinculado',
      Array.from({ length: TAMANO_DE_VER_MAS + 5 }, (_, i) => lead(i + 10)),
    )
    const sinCotizado = relacionados(null)
    const leidos = leadsDeEjemplo(
      { grupos: { ...sinCotizado.grupos, vinculado: muchos } },
      'completo',
    )
    if (!('grupos' in leidos)) throw new Error('debía traer los grupos')
    expect(leidos.grupos.map((g) => g.tipo)).toEqual(['vinculado', 'interesado'])
    expect(leidos.grupos[0]?.leads).toHaveLength(TAMANO_DE_VER_MAS)
  })

  it('con los clientes apagados, el motivo del Live; sin leer los leads, el suyo', () => {
    expect(leadsDeEjemplo(relacionados(), 'apagado')).toEqual({ motivo: MOTIVO_OCULTO_EN_EL_LIVE })
    expect(leadsDeEjemplo(null, 'apagado')).toEqual({ motivo: MOTIVO_OCULTO_EN_EL_LIVE })
    expect(leadsDeEjemplo(null, 'completo')).toEqual({ motivo: MOTIVO_SIN_LEADS })
  })
})
