'use client'

import { CoinsIcon } from 'lucide-react'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@/shared/ui/popover'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useTiposCambioVigentes } from '../../hooks/use-tipos-cambio-vigentes'
import { PanelDeCompartirDiferido } from './diferidos'
import { ListaDeTiposCambio } from './lista-de-tipos-cambio'
import { PieDelPopover } from './pie-del-popover'
import { useCompartirDelPopover } from './use-compartir-del-popover'

type Props = {
  // Quien gestiona los tipos de cambio cambia el valor ahí mismo y tiene a mano ir a configurarlos.
  puedeGestionar: boolean
  alCerrar: () => void
  // Lo pide el editor mientras tiene algo sin guardar: el popover no se cierra al tocar afuera ni con Esc.
  alRetener: (retener: boolean) => void
  // Los que la empresa puso en la barra: lo que «Compartir» marca de entrada.
  idsEnLaBarra: readonly string[]
}

function EsqueletoDeTipos() {
  return (
    <div aria-busy="true" aria-label="Cargando los tipos de cambio" className="grid gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

// Lo que se dibuja dentro del popover de la barra: todos los vigentes (el por defecto adelante, hasta 30), cada uno con su último cambio y,
// para quien los gestiona, el lápiz para cambiar el valor (también con el Modo Live: los números se ven). Su código viaja diferido (`diferidos.tsx`) y lee al abrirse: el marco no lo paga hasta que alguien lo abre.
export function ContenidoDeTiposCambio({
  puedeGestionar,
  alCerrar,
  alRetener,
  idsEnLaBarra,
}: Props) {
  const { zonaHoraria } = useRegional()
  const { vigentes, releer, reintentar } = useTiposCambioVigentes()
  const hayTipos = vigentes.estado === 'listo' && vigentes.filas.length > 0
  const compartir = useCompartirDelPopover(hayTipos, alRetener)

  if (compartir.compartiendo && vigentes.estado === 'listo') {
    return (
      <PanelDeCompartirDiferido
        filas={vigentes.filas}
        idsEnLaBarra={idsEnLaBarra}
        alVolver={compartir.alVolver}
      />
    )
  }

  return (
    <div className="grid min-w-0 gap-2">
      <PopoverHeader>
        <PopoverTitle>Tipos de cambio</PopoverTitle>
        <PopoverDescription>Las horas están en {zonaHoraria}.</PopoverDescription>
      </PopoverHeader>
      {vigentes.estado === 'leyendo' ? <EsqueletoDeTipos /> : null}
      {vigentes.estado === 'error' ? (
        <EstadoError
          compacto
          titulo="No se pudieron leer los tipos de cambio."
          descripcion={vigentes.error.mensaje}
          alReintentar={reintentar}
        />
      ) : null}
      {vigentes.estado === 'listo' && vigentes.filas.length === 0 ? (
        <EstadoVacio compacto Icono={CoinsIcon} titulo="No hay tipos de cambio activos" />
      ) : null}
      {vigentes.estado === 'listo' && vigentes.filas.length > 0 ? (
        <ListaDeTiposCambio
          filas={vigentes.filas}
          hayMas={vigentes.hayMas}
          puedeCambiar={puedeGestionar}
          releer={releer}
          alRetener={compartir.retener}
        />
      ) : null}
      <PieDelPopover
        puedeGestionar={puedeGestionar}
        alCerrar={alCerrar}
        alCompartir={compartir.alCompartir}
        motivoSinCompartir={compartir.motivoSinCompartir}
      />
    </div>
  )
}
