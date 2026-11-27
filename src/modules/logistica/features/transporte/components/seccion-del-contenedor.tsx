'use client'

import { useId } from 'react'
import { MasAcciones } from '@/shared/ui/lista'
import type { SeccionDelEmbarque } from '../../../entities/transporte/secciones-del-embarque'
import {
  SIN_VEHICULOS_EN_EL_CONTENEDOR,
  tituloDelContenedor,
} from '../../../entities/transporte/textos'
import { useMenuDelContenedor, type HuecoParaElMenu } from '../hooks/use-menus-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'
import { VehiculosDelDestino } from './vehiculos-del-destino'

type Props = {
  seccion: SeccionDelEmbarque
  origenId: string
  puedeEditar: boolean
  puedeMover: boolean
  huecos: readonly HuecoParaElMenu[]
}

// Un contenedor del embarque: «Contenedor <n>» (h2) con su estado, tipo y sello, su «⋯» en la esquina y sus vehículos. Un solo nivel: sus vehículos son filas, no otra sección.
export function SeccionDelContenedor({
  seccion,
  origenId,
  puedeEditar,
  puedeMover,
  huecos,
}: Props) {
  const { contenedor: c, vehiculos } = seccion
  const id = useId()
  const titulo = tituloDelContenedor(c.numero)
  const acciones = useMenuDelContenedor({
    id: c.id,
    origenId,
    puedeEditar,
    puedeMover,
    enElDrawer: false,
    huecos,
  })
  return (
    <section
      aria-labelledby={id}
      data-contenedor={c.id}
      className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id={id}
              className="text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)"
            >
              {titulo}
            </h2>
            <InsigniaDeEstado estado={c.estado} />
          </div>
          <p className="flex flex-wrap gap-x-3 text-(length:--text-sm) text-(--color-ink-soft)">
            <span>{c.tipoNombre ?? c.tipo ?? 'Sin tipo'}</span>
            <span className="[overflow-wrap:anywhere]">
              {c.sello === null ? 'Sin sello' : `Sello ${c.sello}`}
            </span>
          </p>
        </div>
        {acciones.length > 0 ? <MasAcciones nombre={titulo} acciones={acciones} conBorde /> : null}
      </div>
      <VehiculosDelDestino
        vehiculos={vehiculos}
        origenId={origenId}
        tipo="contenedor"
        puedeEditar={puedeEditar}
        vacio={SIN_VEHICULOS_EN_EL_CONTENEDOR}
        nombre={`Vehículos de ${titulo}`}
      />
    </section>
  )
}
