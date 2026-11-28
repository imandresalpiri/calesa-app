'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ChipDeEleccion } from '@/shared/ui/filtros'
import {
  CLAVE_DE_FORMATO,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_QUIENES,
  hayFiltrosDePlantillas,
  type PedidoDePlantillas,
} from '../../../entities/filtros'
import { FORMATOS_DE_ARTE, nombreDelTipo } from '../../../entities/formatos'
import type { OrigenDeArtes } from '../../../entities/tipos'
import type { FiltrosDeArtes } from '../hooks/use-filtros-de-artes'

type Props = {
  origenes: readonly OrigenDeArtes[]
  pedido: PedidoDePlantillas
  filtros: FiltrosDeArtes
  alCrear: () => void
}

const FORMATOS = FORMATOS_DE_ARTE.map((f) => ({
  valor: f.clave,
  etiqueta: f.tipo === 'pdf' ? `${f.nombre} (${nombreDelTipo(f.tipo)})` : f.nombre,
}))
const QUIENES = [
  { valor: 'mias', etiqueta: 'Mías' },
  { valor: 'empresa', etiqueta: 'De la empresa' },
]

// Los filtros de la pestaña Plantillas como chips (`?origen=`, `?formato=`, `?de=`), «Limpiar filtros» si hay alguno y «Nueva plantilla» a la
// derecha. Todo con ajuste de línea: en el celular bajan sin ensanchar la página.
export function BarraDeFiltros({ origenes, pedido, filtros, alCrear }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Filtros" className="flex min-w-0 flex-wrap items-center gap-2">
        <ChipDeEleccion
          etiqueta="Origen"
          todas="Todos"
          opciones={origenes.map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
          valor={pedido.origenId}
          alElegir={(valor) => {
            filtros.elegir(CLAVE_DE_ORIGEN, valor)
          }}
        />
        <ChipDeEleccion
          etiqueta="Formato"
          todas="Todos"
          opciones={FORMATOS}
          valor={pedido.formato}
          alElegir={(valor) => {
            filtros.elegir(CLAVE_DE_FORMATO, valor)
          }}
        />
        <ChipDeEleccion
          etiqueta="De quién"
          todas="Todas"
          opciones={QUIENES}
          valor={pedido.de}
          alElegir={(valor) => {
            filtros.elegir(CLAVE_DE_QUIENES, valor)
          }}
        />
        {hayFiltrosDePlantillas(pedido) ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-9"
            onClick={filtros.limpiar}
          >
            Limpiar filtros
          </Button>
        ) : null}
      </div>
      <Button type="button" className="ml-auto min-h-11 md:min-h-9" onClick={alCrear}>
        <PlusIcon aria-hidden />
        Nueva plantilla
      </Button>
    </div>
  )
}
