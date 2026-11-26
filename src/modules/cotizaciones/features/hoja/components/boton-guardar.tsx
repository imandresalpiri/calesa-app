'use client'

import { createPortal } from 'react-dom'
import { Button } from '@/shared/ui/button'
import type { EleccionDeLoQueFalta, LoQueFalta } from '../../../entities/obligatorios-al-cotizar'
import { ElegirLoQueFalta } from './elegir-lo-que-falta'
import { useRanuraDeGuardar } from './menu-de-la-guardada/use-ranura-de-guardar'

export type BotonDeGuardar = {
  // Por qué no se guarda ahora, dicho bajo el botón; nulo, se puede.
  motivo: string | null
  // La región del total ya lo dice (sin total): no se repite bajo el botón.
  motivoYaDicho: boolean
  // Esperando el total al día o guardando: «Guardando…» y apagado (nunca un doble envío).
  ocupado: boolean
  alGuardar: () => void
  // Lo que falta elegir y cómo se elige (el botón de su panel o el pedido): bajo el motivo. Nulo, nada falta.
  paraElegir: { que: LoQueFalta; eleccion: EleccionDeLoQueFalta } | null
}

// «Guardar», además de `Ctrl/Cmd+S` (el celular no tiene atajo; lo ata `useAlGuardar`, sin depender del botón). En la hoja nueva va a todo el ancho, debajo de
// «Avanzado» (el cierre de la hoja), con el motivo y lo que falta elegir debajo. Frena el `mousedown`: así el foco no sale de una celda abierta (un clic afuera
// descartaría lo que no es un número) y el clic hace lo mismo que el atajo, que confirma la celda antes de guardar. En una guardada va en la cabecera, junto a «Compartir»
// (`useRanuraDeGuardar()`, por un portal: sigue siendo de la hoja, con su estado, su motivo y su atajo); mientras la cabecera no montó su lugar, no se dibuja.
export function BotonGuardar({
  motivo,
  motivoYaDicho,
  ocupado,
  alGuardar,
  paraElegir,
}: BotonDeGuardar) {
  const ranura = useRanuraDeGuardar()
  const dicho = motivo !== null && !motivoYaDicho
  if (ranura === null) {
    return null
  }
  const enLaCabecera = ranura !== undefined
  const boton = (
    <div className="grid gap-1">
      <Button
        className={
          enLaCabecera ? 'min-h-11 w-full md:min-h-8 md:w-auto' : 'min-h-11 w-full md:min-h-9'
        }
        disabled={motivo !== null || ocupado}
        aria-describedby={dicho ? 'motivo-para-no-guardar' : undefined}
        onMouseDown={(evento) => {
          evento.preventDefault()
        }}
        onClick={alGuardar}
      >
        {ocupado ? 'Guardando…' : 'Guardar'}
      </Button>
      {!dicho ? null : (
        <p id="motivo-para-no-guardar" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
      {paraElegir === null ? null : (
        <ElegirLoQueFalta que={paraElegir.que} eleccion={paraElegir.eleccion} />
      )}
    </div>
  )
  return enLaCabecera ? createPortal(boton, ranura) : boton
}
