'use client'

import { useEffect, useRef } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { agruparPorDia } from '../../../entities/filtros'
import type { ActividadCargada } from '../hooks/use-actividad'
import { idDeLaFila } from './fila-de-actividad'
import { ListaDeActividad } from './lista-de-actividad'
import { PieDeActividad, VolverALoMasReciente } from './pie-de-actividad'

type Props = {
  actividad: ActividadCargada
  // El día de hoy en la zona de la empresa (`YYYY-MM-DD`), calculado en el servidor: «Hoy» y «Ayer» no cambian al hidratar.
  hoy: string
  zona: string
  // `ajustes_empresa.actividad_dias`: cuánto se conserva.
  diasDeActividad: number
  hayFiltros: boolean
  limpiar: () => void
  idAbierto: number | null
  abrir: (id: number) => void
}

// Un `?cambio=` que está en lo cargado se trae a la vista al llegar (una vez: abrir otro después no mueve la página); su drawer va encima.
function useALaVistaAlLlegar(id: number | null, cargado: boolean) {
  const hecho = useRef(false)
  useEffect(() => {
    if (hecho.current || id === null || !cargado) {
      return
    }
    hecho.current = true
    document.getElementById(idDeLaFila(id))?.scrollIntoView({ block: 'center' })
  }, [id, cargado])
}

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar filtros»), vacío desde una fecha (con «Volver»)
// o la actividad por día con su pie.
export function ResultadoDeActividad({ actividad, hoy, zona, idAbierto, ...props }: Props) {
  useALaVistaAlLlegar(
    idAbierto,
    actividad.filas.some((f) => f.id === idAbierto),
  )
  if (actividad.filas.length === 0) {
    if (actividad.desde !== null) {
      return (
        <div className="grid gap-3">
          <EstadoVacio
            titulo={`No hay actividad hasta el ${formatearFecha(actividad.desde, { zona })}.`}
          />
          <div className="flex justify-center">
            <VolverALoMasReciente actividad={actividad} />
          </div>
        </div>
      )
    }
    if (props.hayFiltros) {
      return (
        <EstadoSinResultados
          alLimpiar={props.limpiar}
          descripcion="Ningún cambio coincide con los filtros."
        />
      )
    }
    return <EstadoVacio titulo={`No hay actividad en los últimos ${props.diasDeActividad} días.`} />
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <ListaDeActividad
        dias={agruparPorDia(actividad.filas, zona, hoy)}
        zona={zona}
        idAbierto={idAbierto}
        abrir={props.abrir}
      />
      <PieDeActividad actividad={actividad} zona={zona} />
    </div>
  )
}
