// Los leads del vehículo de ejemplo del editor de artes (`GET /artes/ejemplo/vehiculos/<id>`): los primeros de cada grupo de «Relacionados»
// (vinculado, interesado, cotizado), sólo con su id y su nombre. Nunca un número ni otro dato del lead: el editor sólo los nombra. Con el Modo
// Live y los clientes apagados, el motivo en vez de los grupos; sin leer leads, el suyo. Puro.
import type { GrupoDeLeadsDeEjemplo, LeadDeEjemplo, LeadsDeEjemplo } from '@/modules/artes'
import type { EstadoDelLive } from '@/modules/equipo'
import type { RelacionadosDelVehiculo } from '@/modules/vehiculos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

export const MOTIVO_OCULTO_EN_EL_LIVE = 'Oculto en Modo Live'
export const MOTIVO_SIN_LEADS = 'No ves los leads de este origen.'
export const MOTIVO_SIN_LEER_LOS_LEADS = 'No se pudieron leer los leads de este vehículo.'

// Cómo deja el Modo Live ver a los clientes (`apagado`, `nombres` o `completo`; glosario: «Ajustes del Live»): sin el Live, como «Completo».
export type ClientesEnElLive = Extract<EstadoDelLive, { encendido: true }>['ajustes']['clientes']

export function clientesEnElLive(live: EstadoDelLive): ClientesEnElLive {
  return live.encendido ? live.ajustes.clientes : 'completo'
}

// Si quien mira lee los leads del vehículo: no con los clientes apagados; con «Sólo nombres», si los permisos reales tienen `leads.ver`
// (`nombresDeClientes`: los del Live ya llegan sin él); si no, con `leads.ver`. Lo que llega lo decide la RLS.
export function leeLosLeads({
  permisos,
  live,
}: {
  permisos: Permisos
  live: EstadoDelLive
}): boolean {
  if (clientesEnElLive(live) === 'apagado') {
    return false
  }
  if (live.encendido && live.nombresDeClientes) {
    return true
  }
  return puede(permisos, 'leads.ver')
}

const ORDEN: readonly GrupoDeLeadsDeEjemplo[] = ['vinculado', 'interesado', 'cotizado']

// Sólo el id y el nombre de cada lead (los números no salen de acá); sin nombre, no se nombra. Cada grupo con lo suyo: el mismo lead puede
// estar en dos.
function leadsDelGrupo(
  filas: RelacionadosDelVehiculo['grupos']['vinculado']['filas'],
): LeadDeEjemplo[] {
  const leads: LeadDeEjemplo[] = []
  for (const { contraparte } of filas) {
    const nombre = contraparte.nombre.trim()
    if (nombre !== '' && !leads.some((lead) => lead.leadId === contraparte.leadId)) {
      leads.push({ leadId: contraparte.leadId, nombre })
    }
  }
  return leads.slice(0, TAMANO_DE_VER_MAS)
}

// `relacionados` nulo: quien mira no lee los leads de este vehículo (`leeLosLeads()`).
export function leadsDeEjemplo(
  relacionados: Pick<RelacionadosDelVehiculo, 'grupos'> | null,
  clientes: ClientesEnElLive,
): LeadsDeEjemplo {
  if (clientes === 'apagado') {
    return { motivo: MOTIVO_OCULTO_EN_EL_LIVE }
  }
  if (relacionados === null) {
    return { motivo: MOTIVO_SIN_LEADS }
  }
  return {
    grupos: ORDEN.flatMap((tipo) => {
      const grupo = relacionados.grupos[tipo]
      return grupo === null ? [] : [{ tipo, leads: leadsDelGrupo(grupo.filas) }]
    }),
  }
}
