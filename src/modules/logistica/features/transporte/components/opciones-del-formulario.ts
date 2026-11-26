import type { TransporteDeLaUnidad } from '../../../areas/transporte/composicion.client'
import {
  opcionesDeTransporte,
  type ElementoDeOferta,
  type OpcionDeTransporte,
} from '../../../entities/transporte/oferta'
import type { Transporte } from '../../../entities/transporte/transporte'

export type OpcionesDelFormulario = {
  navieras: OpcionDeTransporte[]
  puertosOrigen: OpcionDeTransporte[]
  puertosDestino: OpcionDeTransporte[]
}

const SIN_OFRECER: readonly ElementoDeOferta[] = []

// Las opciones de los tres selectores: lo que ofrece el flujo y usa el origen de la unidad y, siempre, lo ya guardado (6.08-2, D13). Sin flujo activo no hay oferta: se ofrece todo lo
// activo que usa el origen.
export function opcionesDelFormulario(
  datos: TransporteDeLaUnidad,
  guardado: Transporte | null,
): OpcionesDelFormulario {
  const oferta = datos.oferta
  return {
    navieras: opcionesDeTransporte({
      ofrecidos: oferta ? oferta.navieras : SIN_OFRECER,
      catalogo: datos.navieras,
      alcance: datos.alcanceDeNavieras,
      guardado: guardado ? guardado.navieraId : null,
      femenino: true,
    }),
    puertosOrigen: opcionesDeTransporte({
      ofrecidos: oferta ? oferta.puertosOrigen : SIN_OFRECER,
      catalogo: datos.puertos,
      alcance: datos.alcanceDePuertos,
      guardado: guardado ? guardado.puertoOrigenId : null,
      femenino: false,
    }),
    puertosDestino: opcionesDeTransporte({
      ofrecidos: oferta ? oferta.puertosDestino : SIN_OFRECER,
      catalogo: datos.puertos,
      alcance: datos.alcanceDePuertos,
      guardado: guardado ? guardado.puertoDestinoId : null,
      femenino: false,
    }),
  }
}
