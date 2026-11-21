'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { ChipDeEleccion } from '@/shared/ui/filtros'
import { IrAUnaFecha } from '@/shared/ui/ir-a-una-fecha'
import { etiquetaDeEntidad } from '../../../entities/etiquetas'
import type { OpcionDeActividad, PedidoDeActividad } from '../../../entities/filtros'
import type { FiltrosDeActividad } from '../hooks/use-filtros-de-actividad'
import type { ActividadCargada } from '../hooks/use-actividad'
import { ChipQuitable } from './chip-quitable'

type Props = {
  personas: readonly OpcionDeActividad[]
  entidades: readonly OpcionDeActividad[]
  pedido: PedidoDeActividad
  // El nombre del registro cuando la lista es la de uno solo (de sus filas); nulo si no se sabe.
  registroTitulo: string | null
  filtros: FiltrosDeActividad
  actividad: ActividadCargada
  zona: string
}

// Los filtros de `/actividad` como chips arriba de la lista: persona y tipo de registro (`?persona=`, `?entidad=`), el registro que trae «Ver
// actividad» de una ficha (`?registro=`) y la fecha de «Ir a una fecha», cada uno con su «×», y «Limpiar filtros».
export function BarraDeFiltros(props: Props) {
  const { pedido, filtros, actividad, zona } = props
  const hayFiltros = pedido.actor !== null || pedido.tabla !== null
  return (
    <div role="group" aria-label="Filtros" className="flex flex-wrap items-end gap-2">
      <ChipDeEleccion
        etiqueta="Persona"
        todas="Todas"
        opciones={props.personas}
        valor={pedido.actor}
        alElegir={filtros.elegirPersona}
      />
      <ChipDeEleccion
        etiqueta="Tipo de registro"
        todas="Todos"
        opciones={props.entidades}
        valor={pedido.tabla}
        alElegir={filtros.elegirEntidad}
      />
      {pedido.tabla !== null && pedido.registro !== null ? (
        <ChipQuitable
          texto={`Registro: ${props.registroTitulo ?? `un ${etiquetaDeEntidad(pedido.tabla).toLowerCase()}`}`}
          quitar="Quitar el filtro del registro"
          alQuitar={filtros.quitarRegistro}
        />
      ) : null}
      {actividad.desde !== null ? (
        <ChipQuitable
          texto={`Hasta el ${formatearFecha(actividad.desde, { zona })}`}
          quitar="Volver a lo más reciente"
          ocupado={actividad.ocupado}
          alQuitar={actividad.volver}
        />
      ) : null}
      <IrAUnaFecha zona={zona} ocupado={actividad.ocupado} alIr={actividad.irAUnaFecha} />
      {hayFiltros ? (
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
  )
}
