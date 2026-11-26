// El «Cliente» de la cabecera de `/repuestos/[id]` (glosario: «Cliente (de un proyecto)»). Puro: la página lo arma con el proyecto y el lead que leyó, y la
// cabecera sólo lo dibuja. Manda el lead; en un proyecto viejo, el nombre escrito a mano (sin el teléfono, como siempre). Un lead que quien mira no ve —o
// que no puede leer sin `leads.ver`— se dice igual en todos los casos y sin datos: no se distingue «no existe» de «no lo ves».
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { RUTAS } from '@/shared/lib/rutas'

// El lead tal como lo leyó la página (por su id, con la RLS de quien mira): su nombre, sus números y si está en su cartera. Nunca el teléfono.
export type LeadDeLaCabecera = {
  id: string
  nombre: string
  numeros: NumerosDeLead
  enCartera: boolean
}

export type ClienteDeLaCabecera =
  | { tipo: 'lead'; id: string; nombre: string; numeros: NumerosDeLead; enCartera: boolean }
  | { tipo: 'oculto' }
  | { tipo: 'libre'; nombre: string }
  | { tipo: 'ninguno' }

export const CLIENTE_QUE_NO_PUEDES_VER = 'Cliente que no puedes ver'
export const CLIENTE_FUERA_DE_TU_CARTERA = 'Fuera de tu cartera'
export const LEAD_SIN_NOMBRE = 'Sin nombre'

type Entrada = {
  leadId: string | null
  clienteNombre: string | null
  // Nulo: no se leyó (sin `leads.ver`) o la lectura volvió sin fila.
  lead: LeadDeLaCabecera | null
}

export function clienteDeLaCabecera({ leadId, clienteNombre, lead }: Entrada): ClienteDeLaCabecera {
  if (leadId !== null) {
    if (lead === null || lead.id !== leadId) {
      return { tipo: 'oculto' }
    }
    const nombre = lead.nombre.trim()
    return {
      tipo: 'lead',
      id: lead.id,
      nombre: nombre === '' ? LEAD_SIN_NOMBRE : nombre,
      numeros: lead.numeros,
      enCartera: lead.enCartera,
    }
  }
  const escrito = clienteNombre?.trim() ?? ''
  return escrito === '' ? { tipo: 'ninguno' } : { tipo: 'libre', nombre: escrito }
}

/** El cliente como una línea de texto, con la ficha del lead si la hay (la tarjeta «Vehículo y cliente» del panel del ítem; la cabecera lo dibuja con su propio componente). */
export function textoDelCliente(cliente: ClienteDeLaCabecera): {
  texto: string
  href: string | null
} {
  switch (cliente.tipo) {
    case 'lead':
      return { texto: cliente.nombre, href: `${RUTAS.leads}/${cliente.id}` }
    case 'oculto':
      return { texto: CLIENTE_QUE_NO_PUEDES_VER, href: null }
    case 'libre':
      return { texto: cliente.nombre, href: null }
    case 'ninguno':
      return { texto: '—', href: null }
  }
}
