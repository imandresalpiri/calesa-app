import { puede, type Permisos } from '@/modules/equipo'
import type { FaseResumen } from '@/modules/flujos'
import { proyectoDe, rutaDelProyecto } from '@/modules/repuestos'
import {
  alcanceDeAvisos,
  bloqueoParaEnviar,
  leadsVisiblesDe,
  papeleraDelVehiculo,
  vehiculoDelAviso,
  type Vehiculo,
} from '@/modules/vehiculos'
import { DOCUMENTOS_DEL_AVISO } from '../documentos-del-aviso'

// «Ver el proyecto de repuestos» de un aviso: la ruta del proyecto del vehículo, sólo si se puede enviar a la papelera (la causa `repuestos` sale de
// ahí) y con `repuestos.ver`. `proyectoDe` tiene `cache()`: es la misma fila que el enlace corto de la cabecera. Si la lectura falla, no se ofrece
// (el error lo dice el bloque de la derecha).
async function proyectoDelAviso(
  vehiculoId: string,
  permisos: Permisos,
  eliminable: boolean,
): Promise<string | null> {
  if (!eliminable || !puede(permisos, 'repuestos.ver')) {
    return null
  }
  const leido = await proyectoDe(vehiculoId)
  return leido.ok && leido.data !== null ? rutaDelProyecto(leido.data.id) : null
}

// Lo que la ficha sabe de «Enviar a la papelera» antes de intentarlo: si se ve apagada, con qué motivo y con qué acciones (quitar el vínculo, ver el
// lead, ver en logística…), y lo que el aviso ofrece si la base lo rechaza al intentar. Si el vehículo tiene lead y se puede enviar, el «Ver el
// lead» depende de que ese lead se abra (una pregunta a la base; sin lead, o sin `leads.ver`, ninguna).
export async function papeleraYAvisosDe(pedido: {
  sesion: { permisos: Permisos; usuarioId: string }
  vehiculo: Vehiculo
  origenId: string
  fase: FaseResumen | null
  editable: boolean
  eliminable: boolean
}) {
  const { sesion, vehiculo, origenId, fase, editable, eliminable } = pedido
  const [leadsVisibles, proyecto] = await Promise.all([
    leadsVisiblesDe(sesion, [vehiculo], new Set(eliminable ? [vehiculo.id] : [])),
    proyectoDelAviso(vehiculo.id, sesion.permisos, eliminable),
  ])
  const leadVisible = leadsVisibles.has(vehiculo.id)
  const alcance = alcanceDeAvisos(sesion.permisos, origenId, DOCUMENTOS_DEL_AVISO)
  return {
    papelera: papeleraDelVehiculo({ eliminable, vehiculo, fase, editable, leadVisible, alcance }),
    avisos: { vehiculo: vehiculoDelAviso(vehiculo, { editable, leadVisible, proyecto }), alcance },
    // Si, sin el vínculo, iría a la papelera: lo ofrece el aviso de desvinculado tras «Quitar el vínculo».
    ofrecerPapelera: eliminable && bloqueoParaEnviar({ ...vehiculo, leadId: null }, fase) === null,
  }
}
