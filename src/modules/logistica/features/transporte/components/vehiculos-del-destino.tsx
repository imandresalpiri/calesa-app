'use client'

import type { VehiculoDelEmbarque } from '../../../entities/transporte/embarque'
import type { TipoDeDestino } from '../../../entities/transporte/repositorio-de-embarques'
import { useQuitarDelTransporte } from '../hooks/use-quitar-del-transporte'
import { FilaDelVehiculo } from './fila-del-vehiculo'

type Props = {
  vehiculos: readonly VehiculoDelEmbarque[]
  origenId: string
  // De dónde sale al quitarlo: de su contenedor (queda directo en el embarque) o del embarque.
  tipo: TipoDeDestino
  puedeEditar: boolean
  // Lo que se dice sin vehículos.
  vacio: string
  nombre: string
}

// Los vehículos de un contenedor o los sueltos de un embarque, cada uno con «Quitar» si se puede editar el transporte.
export function VehiculosDelDestino({
  vehiculos,
  origenId,
  tipo,
  puedeEditar,
  vacio,
  nombre,
}: Props) {
  const { quitando, quitar } = useQuitarDelTransporte(origenId)
  if (vehiculos.length === 0) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{vacio}</p>
  }
  const etiqueta = tipo === 'contenedor' ? 'Quitar del contenedor' : 'Quitar del embarque'
  return (
    <ul aria-label={nombre} className="grid grid-cols-[minmax(0,1fr)]">
      {vehiculos.map((v) => (
        <FilaDelVehiculo
          key={v.vehiculoId}
          v={v}
          origenId={origenId}
          quitar={
            puedeEditar
              ? {
                  etiqueta,
                  enCurso: quitando === v.vehiculoId,
                  alQuitar: () => void quitar(tipo, v),
                }
              : undefined
          }
        />
      ))}
    </ul>
  )
}
