// Lo que el editor arma con el vehículo de ejemplo elegido (docs/GLOSARIO.md › «Vehículo de ejemplo»): qué lead queda elegido de entrada y los
// datos del arte, todos reales (con un vehículo elegido nada es de ejemplo: lo que falta, falta). Puro.
import type {
  CotizacionDeEjemplo,
  GrupoDeLeadsDeEjemplo,
  LeadDeEjemplo,
  LeadsDeEjemplo,
  VehiculoDeEjemplo,
} from './respuestas'
import type { DatosDelArte, FijosDelArte } from './tipos'

// Los leads relacionados en su orden (vinculado, interesados, cotizados), sin repetir: uno que está en dos grupos aparece en el primero.
export function leadsDelEjemplo(leads: LeadsDeEjemplo): LeadDeEjemplo[] {
  if (!('grupos' in leads)) {
    return []
  }
  const vistos = new Set<string>()
  const todos: LeadDeEjemplo[] = []
  for (const grupo of leads.grupos) {
    for (const lead of grupo.leads) {
      if (!vistos.has(lead.leadId)) {
        vistos.add(lead.leadId)
        todos.push(lead)
      }
    }
  }
  return todos
}

// El lead de entrada: el recordado si sigue entre los relacionados; si no, el de la cotización elegida si está entre ellos; si no, el
// vinculado; si no, ninguno.
export function leadPreferido(
  leads: LeadsDeEjemplo,
  { recordado, deLaCotizacion }: { recordado: string | null; deLaCotizacion: string | null },
): LeadDeEjemplo | null {
  if (!('grupos' in leads)) {
    return null
  }
  const todos = leadsDelEjemplo(leads)
  const buscar = (id: string | null) =>
    id === null ? undefined : todos.find((l) => l.leadId === id)
  const vinculado = leads.grupos.find((g) => g.tipo === 'vinculado')?.leads[0]
  return buscar(recordado) ?? buscar(deLaCotizacion) ?? vinculado ?? null
}

// Al cambiar de cotización: su lead si está entre los relacionados; si no, el que ya estaba.
export function leadAlCambiarDeCotizacion(
  leads: LeadsDeEjemplo,
  actual: LeadDeEjemplo | null,
  deLaCotizacion: string | null,
): LeadDeEjemplo | null {
  const suyo = leadsDelEjemplo(leads).find((l) => l.leadId === deLaCotizacion)
  return suyo ?? actual
}

export type EjemploConDatos = {
  vehiculo: VehiculoDeEjemplo
  cotizacion: CotizacionDeEjemplo | null
  lead: LeadDeEjemplo | null
}

export function datosDelEjemploElegido(
  elegido: EjemploConDatos,
  fijos: FijosDelArte,
): DatosDelArte {
  return {
    deEjemplo: false,
    vehiculo: elegido.vehiculo.vehiculo,
    cotizacion: elegido.cotizacion?.cotizacion ?? null,
    lead: elegido.lead ? { nombre: elegido.lead.nombre } : null,
    asesor: fijos.asesor,
    empresa: fijos.empresa,
  }
}

// El disparador de la barra: «Datos de ejemplo» sin nada elegido; si no, el vehículo y, con cotización, su número.
export function textoDelEjemploElegido(elegido: EjemploConDatos | null): string {
  if (!elegido) {
    return 'Datos de ejemplo'
  }
  const { titulo } = elegido.vehiculo.vehiculo
  const numero = elegido.cotizacion ? ` · n.º ${String(elegido.cotizacion.cotizacion.numero)}` : ''
  return `Vehículo de ejemplo: ${titulo}${numero}`
}

export const TITULOS_DE_LOS_GRUPOS_DE_LEADS: Readonly<Record<GrupoDeLeadsDeEjemplo, string>> = {
  vinculado: 'Vinculado',
  interesado: 'Interesados',
  cotizado: 'Cotizados',
}

// Los grupos para elegir el lead, cada uno con su título y sin los que ya salieron en uno anterior; los vacíos no van.
export function gruposDeLeadsDelEjemplo(
  leads: LeadsDeEjemplo,
): { titulo: string; leads: LeadDeEjemplo[] }[] {
  if (!('grupos' in leads)) {
    return []
  }
  const vistos = new Set<string>()
  const grupos: { titulo: string; leads: LeadDeEjemplo[] }[] = []
  for (const grupo of leads.grupos) {
    const nuevos = grupo.leads.filter((l) => !vistos.has(l.leadId))
    for (const lead of nuevos) {
      vistos.add(lead.leadId)
    }
    if (nuevos.length > 0) {
      grupos.push({ titulo: TITULOS_DE_LOS_GRUPOS_DE_LEADS[grupo.tipo], leads: nuevos })
    }
  }
  return grupos
}
