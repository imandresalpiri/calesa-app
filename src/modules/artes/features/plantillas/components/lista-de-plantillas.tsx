'use client'

import { PlusIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import type { AccionesDeLasPlantillas } from '../hooks/use-acciones-de-las-plantillas'
import type { PlantillasCargadas } from '../hooks/use-plantillas'
import { PieDeArtes } from './pie-de-artes'
import { TarjetaDePlantilla } from './tarjeta-de-plantilla'

type Props = {
  plantillas: PlantillasCargadas
  acciones: AccionesDeLasPlantillas
  yo: string
  hayFiltros: boolean
  limpiar: () => void
  alCrear: () => void
}

// «Mostrando las 500 más recientes. Filtra por origen o formato para ver otras.»
const TOPE = `${textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} Filtra por origen o formato para ver otras.`

// La rejilla de plantillas de arte (de la más reciente a la más vieja): tantas columnas de 16 rem como entren, una en el celular. O el estado
// que toca: vacío por primera vez (con «Nueva plantilla») o vacío por filtro (con «Limpiar filtros»).
export function ListaDePlantillas({
  plantillas,
  acciones,
  yo,
  hayFiltros,
  limpiar,
  alCrear,
}: Props) {
  if (plantillas.filas.length === 0) {
    return hayFiltros ? (
      <EstadoSinResultados
        alLimpiar={limpiar}
        descripcion="Ninguna plantilla de arte con estos filtros."
      />
    ) : (
      <EstadoVacio
        titulo="Todavía no hay plantillas de arte."
        descripcion="Una plantilla de arte es el diseño de una imagen o un PDF para compartir una cotización."
        accion={
          <Button type="button" className="min-h-11 md:min-h-9" onClick={alCrear}>
            <PlusIcon aria-hidden />
            Nueva plantilla
          </Button>
        }
      />
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <ul
        aria-label="Plantillas de arte"
        className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3"
      >
        {plantillas.filas.map((plantilla) => (
          <TarjetaDePlantilla
            key={plantilla.id}
            plantilla={plantilla}
            origenNombre={acciones.nombreDelOrigen(plantilla.origenId)}
            esPorDefecto={acciones.esPorDefecto(plantilla)}
            yo={yo}
            menu={acciones.menuDe(plantilla)}
          />
        ))}
      </ul>
      <PieDeArtes carga={plantillas} tope={TOPE} />
    </div>
  )
}
