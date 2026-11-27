'use client'

import { useId } from 'react'
import type { VehiculoDelEmbarque } from '../../../entities/transporte/embarque'
import { QUE_SON_LOS_SUELTOS } from '../../../entities/transporte/textos'
import { VehiculosDelDestino } from './vehiculos-del-destino'

type Props = {
  titulo: string
  // Los sueltos (directos en el embarque) o los de contenedores que pasaron el tope.
  tipo: 'sueltos' | 'otros'
  vehiculos: readonly VehiculoDelEmbarque[]
  origenId: string
  puedeEditar: boolean
}

// «Sueltos»: los vehículos que van directos en el embarque; «Otros contenedores»: los que van en un contenedor que pasó el tope de 100. Al final de la página, al mismo nivel que los
// contenedores. Un suelto se quita del embarque; uno de otro contenedor, de su contenedor.
export function SeccionDeSueltos({ titulo, tipo, vehiculos, origenId, puedeEditar }: Props) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <div className="grid gap-0.5">
        <h2 id={id} className="text-(length:--text-base) font-medium text-(--color-ink)">
          {titulo}
        </h2>
        {tipo === 'sueltos' ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{QUE_SON_LOS_SUELTOS}</p>
        ) : null}
      </div>
      <VehiculosDelDestino
        vehiculos={vehiculos}
        origenId={origenId}
        tipo={tipo === 'sueltos' ? 'embarque' : 'contenedor'}
        puedeEditar={puedeEditar}
        vacio=""
        nombre={`Vehículos: ${titulo}`}
      />
    </section>
  )
}
