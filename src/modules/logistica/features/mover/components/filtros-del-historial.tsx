'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { FiltroDelHistorial } from '../../../entities/mover/filtro-del-historial'
import type { OpcionesDelHistorial } from './cadena/proveedor-de-la-cadena'

const TODAS = { valor: '', etiqueta: 'Todas' }
const TODOS = { valor: '', etiqueta: 'Todos' }

// Los dos filtros del historial de la unidad: la fase a la que entró y quién lo movió. Las opciones son las de las pasadas que ya leyó la cadena; filtrar lo hace la base.
// Una fila de alto fijo: cambiar de filtro no mueve la lista.
export function FiltrosDelHistorial({
  opciones,
  filtro,
  cambiar,
}: {
  opciones: OpcionesDelHistorial
  filtro: FiltroDelHistorial
  cambiar: (cambio: Partial<FiltroDelHistorial>) => void
}) {
  return (
    <div role="group" aria-label="Filtrar el historial" className="grid grid-cols-2 gap-2">
      <CampoSeleccion
        nombre="historial-fase"
        etiqueta="Fase"
        opciones={[TODAS, ...opciones.fases]}
        value={filtro.fase ?? ''}
        onChange={(evento) => {
          cambiar({ fase: evento.target.value || null })
        }}
      />
      <CampoSeleccion
        nombre="historial-quien"
        etiqueta="Quién"
        opciones={[TODOS, ...opciones.quienes]}
        value={filtro.quien ?? ''}
        onChange={(evento) => {
          cambiar({ quien: evento.target.value || null })
        }}
      />
    </div>
  )
}
