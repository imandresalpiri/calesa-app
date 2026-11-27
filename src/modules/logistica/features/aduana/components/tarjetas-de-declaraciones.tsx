'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { textoDelCanal, type FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { sinVehiculos } from '../../../entities/aduana/estado'
import { vehiculosDeLaFila } from '../../../entities/aduana/textos'
import { EstadoDeTributos } from './estado-de-tributos'

type Props = {
  declaraciones: readonly FilaDeDeclaracion[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// La fecha de aceptación y el despachante, en una línea; nada si no hay ninguno.
function Detalle({ declaracion, zona }: { declaracion: FilaDeDeclaracion; zona: string }) {
  const partes = [
    declaracion.aceptadaEl
      ? `Aceptada el ${formatearFecha(declaracion.aceptadaEl, { zona })}`
      : null,
    declaracion.despachante,
  ].filter((parte) => parte !== null)
  if (partes.length === 0) return null
  return (
    <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
      {partes.join(' · ')}
    </p>
  )
}

// Las declaraciones de la página en el celular: una tarjeta por declaración, con lo mismo que la fila de la tabla. Un toque abre el resumen.
export function TarjetasDeDeclaraciones({ declaraciones, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {declaraciones.map((declaracion) => (
        <TarjetaDeLista
          key={declaracion.id}
          abierta={abierta === declaracion.id}
          alAbrir={() => {
            alAbrir(declaracion.id)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`la declaración ${declaracion.numero}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {declaracion.numero}
            </AbrirResumen>
            <Badge variant="secondary">{textoDelCanal(declaracion.canal)}</Badge>
          </div>
          <EstadoDeTributos {...declaracion} />
          {sinVehiculos(declaracion) ? (
            <Badge variant="outline" className="w-fit">
              Sin vehículos
            </Badge>
          ) : (
            <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
              {vehiculosDeLaFila(
                declaracion.primeros,
                declaracion.vehiculos,
                declaracion.hayOcultos,
              )}
            </p>
          )}
          <Detalle declaracion={declaracion} zona={zonaHoraria} />
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
