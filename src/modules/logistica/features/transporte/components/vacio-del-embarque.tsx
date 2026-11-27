'use client'

import { PackageOpenIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  PANEL_AGREGAR_CONTENEDOR,
  PANEL_AGREGAR_VEHICULOS,
} from '../../../entities/transporte/paneles'
import { SIN_CONTENEDORES } from '../../../entities/transporte/textos'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

// Un embarque recién creado, sin contenedores ni vehículos: lo dice y, si se puede editar, ofrece llenarlo.
export function VacioDelEmbarque({ puedeEditar }: { puedeEditar: boolean }) {
  const paneles = usePanelDeEmbarques()
  return (
    <EstadoVacio
      Icono={PackageOpenIcon}
      titulo={SIN_CONTENEDORES}
      descripcion="Sus contenedores y los vehículos que van sueltos aparecen acá."
      accion={
        puedeEditar ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => paneles.abrir(PANEL_AGREGAR_CONTENEDOR, null)}>
              Agregar contenedor
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => paneles.abrir(PANEL_AGREGAR_VEHICULOS, null)}
            >
              Agregar vehículos
            </Button>
          </div>
        ) : undefined
      }
    />
  )
}
