'use client'

import {
  estadoDelModoGanada,
  vistaDelHueco,
  type VistaDelHueco,
} from '../../../entities/mover/ganada'
import {
  HAY_MAS_DESTINOS,
  SIN_CONEXION_EN_QUE_FALTA,
  SIN_DESTINOS,
  SIN_FASE,
} from '../../../entities/mover/textos'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useDestinoInicialDelMover } from '../../nucleo/destino-inicial'
import type { QueFalta } from '../actions/leer-que-falta'
import { useAccionesDeQueFalta } from '../hooks/use-acciones-de-que-falta'
import { conAbiertoPorDefecto, type BorradorDeMover } from '../hooks/use-borrador-de-mover'
import type { ModoGanada } from '../hooks/use-modo-ganada'
import { DestinoDeMover } from './destino-de-mover'
import { FueraDeRegla } from './fuera-de-regla'
import { LineaDeGanada } from './linea-de-ganada'
import { PedirloDeQueFalta } from './pedirlo-de-que-falta'

type Props = {
  unidad: UnidadAbierta
  dato: QueFalta
  actualizando: boolean
  releer: () => void
  borrador: BorradorDeMover
  // El modo «La ganamos» de la URL (sólo vale para un vehículo).
  modoGanada: ModoGanada
  // La fase directa que se mira en la cadena: sólo ese destino, abierto (sin «fuera de regla» ni «hay más»: son de lo de hoy).
  soloDestino?: string | null
}

function soloElDestino(dato: QueFalta, faseId: string | null | undefined): QueFalta {
  if (!faseId) return dato
  return {
    ...dato,
    destinos: dato.destinos.filter((d) => d.faseId === faseId),
    fueraDeRegla: [],
    hayMasDestinos: false,
  }
}

// El destino que abre solo: el de «La ganamos» o, fuera de ese modo, el que pidió el botón del siguiente (`?destino=`) si está entre los leídos. Si la unidad cambió de
// fase, ese destino ya no está y no se abre nada.
function abiertoPorDefecto(
  vista: VistaDelHueco<{ faseId: string }>,
  modo: unknown,
  destinoInicial: string | null,
): string | null {
  if (vista.abiertoPorDefecto) return vista.abiertoPorDefecto
  if (modo !== null || destinoInicial === null) return null
  return vista.destinos.some((d) => d.faseId === destinoInicial) ? destinoInicial : null
}

// El modo «La ganamos», la lista que toca y el borrador con que se mueve (en el modo, con el primer destino abierto y anotando la subasta ganada).
function armarLaLista({
  unidad,
  dato,
  borrador,
  modoGanada,
  destinoInicial,
}: Omit<Props, 'actualizando' | 'releer' | 'soloDestino'> & { destinoInicial: string | null }) {
  const esVehiculo = unidad.tipo === 'vehiculo'
  const modo =
    modoGanada.activo && esVehiculo
      ? estadoDelModoGanada({
          situacion: unidad.situacion,
          faseActualId: dato.faseActualId,
          destinos: dato.destinos,
        })
      : null
  const vista = vistaDelHueco(modo, dato.destinos)
  const porDefecto = abiertoPorDefecto(vista, modo, destinoInicial)
  const conDefecto = porDefecto ? conAbiertoPorDefecto(borrador, porDefecto) : borrador
  return {
    modo,
    vista,
    borrador: vista.anotaGanada ? conDefecto : { ...conDefecto, ganada: null },
    ofrecer: esVehiculo && unidad.situacion === 'sin_resolver' && dato.puedeMover,
  }
}

// Lo que dibuja «Qué falta» con la lectura lista: los destinos (o los de «La ganamos») y lo que cada uno pide.
export function CuerpoDeQueFalta({ soloDestino = null, ...props }: Props) {
  const { unidad, actualizando, releer, modoGanada } = props
  const dato = soloElDestino(props.dato, soloDestino)
  const inicial = useDestinoInicialDelMover()
  const { modo, vista, borrador, ofrecer } = armarLaLista({
    ...props,
    dato,
    destinoInicial: soloDestino ?? inicial,
  })
  const acciones = useAccionesDeQueFalta(unidad, dato.acciones)
  return (
    <div className="grid gap-3" data-hueco="que-falta" data-estado="listo">
      <p
        id={acciones.idSinConexion}
        aria-live="polite"
        className="min-h-4 text-(length:--text-sm) text-(--color-ink-faint)"
      >
        {acciones.enLinea ? (actualizando ? 'Actualizando…' : '') : SIN_CONEXION_EN_QUE_FALTA}
      </p>
      {dato.faseActualId === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_FASE}</p>
      ) : null}
      {dato.fueraDeRegla.length > 0 ? <FueraDeRegla faltan={dato.fueraDeRegla} /> : null}
      <LineaDeGanada modo={modo} ofrecer={ofrecer} alGanar={modoGanada.activar} />
      {vista.diceSinDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_DESTINOS}</p>
      ) : null}
      {vista.destinos.length > 0 ? (
        <ul className="grid gap-3">
          {vista.destinos.map((destino) => (
            <DestinoDeMover
              key={destino.faseId}
              unidad={unidad}
              destino={destino}
              puedeMover={dato.puedeMover}
              borrador={borrador}
              releer={releer}
              acciones={acciones}
            />
          ))}
        </ul>
      ) : null}
      {dato.hayMasDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{HAY_MAS_DESTINOS}</p>
      ) : null}
      {unidad.tipo === 'vehiculo' ? (
        <PedirloDeQueFalta vehiculoId={unidad.id} acciones={dato.acciones} />
      ) : null}
    </div>
  )
}
