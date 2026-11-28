'use client'

import { SearchIcon } from 'lucide-react'
import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useBusquedaDeVehiculos } from '../../hooks/use-busqueda-de-vehiculos'
import type { VehiculoDeEjemploDelEditor } from '../../hooks/use-vehiculo-de-ejemplo'
import { ElegirCotizacion } from './elegir-cotizacion'
import { ElegirLead } from './elegir-lead'
import { ListaDeVehiculos } from './lista-de-vehiculos'
import { PieDelEjemplo } from './pie-del-ejemplo'

export type PropsDelPanelDelEjemplo = {
  ejemplo: VehiculoDeEjemploDelEditor
  origen: { id: string; nombre: string }
  sinClientes: boolean
}

// El cuerpo del popover «Vehículo de ejemplo» (se pide con `diferido()` la primera vez que se abre): buscar entre los vehículos del origen
// de la plantilla, la lista de alto fijo, la cotización y el lead del elegido y volver a los datos de ejemplo. Todo cabe en el alto del
// popover: lo que cambia (buscar, leer, un error) cambia dentro de su caja.
export function PanelDelEjemplo({ ejemplo, origen, sinClientes }: PropsDelPanelDelEjemplo) {
  const id = useId()
  const busqueda = useBusquedaDeVehiculos(origen.id)
  const { elegido, lectura } = ejemplo
  return (
    <div
      data-panel-del-ejemplo
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto_auto] gap-2 p-3"
    >
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
          Buscar en {origen.nombre}
        </Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-(--color-ink-soft)"
          />
          <Input
            id={id}
            type="search"
            autoComplete="off"
            placeholder="Título, VIN o lote"
            maxLength={100}
            value={busqueda.texto}
            onChange={(evento) => {
              busqueda.setTexto(evento.target.value)
            }}
            className="h-8 pl-7"
          />
        </div>
      </div>
      <div className="min-h-0 rounded-(--radius-md) border border-(--color-line)">
        <ListaDeVehiculos
          estado={busqueda.estado}
          origen={origen.nombre}
          elegidoId={elegido?.vehiculo.vehiculo.id ?? null}
          alElegir={ejemplo.elegirVehiculo}
          verMas={busqueda.verMas}
          reintentar={busqueda.reintentar}
        />
      </div>
      <ElegirCotizacion
        elegido={elegido}
        cotizaciones={ejemplo.cotizaciones}
        alElegir={ejemplo.elegirCotizacion}
        ocupado={lectura.cargando}
      />
      <ElegirLead elegido={elegido} sinClientes={sinClientes} alElegir={ejemplo.elegirLead} />
      <PieDelEjemplo
        lectura={lectura}
        hayElegido={elegido !== null}
        reintentar={ejemplo.reintentar}
        soltar={ejemplo.soltar}
      />
    </div>
  )
}
