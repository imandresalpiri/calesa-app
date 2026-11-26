'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import type { ParaElegirConLector } from '../../../entities/dato-para-elegir'
import type { VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'
import { DatoDelElegido } from './dato-del-elegido'
import { VerLaFicha } from './ver-la-ficha'

type Props = {
  elegido: VehiculoElegido
  // El historial del elegido, armado por la página (`vehiculos` no conoce `cotizaciones`): va debajo de su título.
  historial: ReactNode
  // Sin él (una guardada: no se queda sin vehículo), el elegido se ve sin «Quitar».
  alQuitar?: (() => void) | undefined
  // Los datos del vehículo que se eligen entre las filas de una tabla de la hoja (4.14-2c3), con su lector; null = ninguno.
  paraElegir: ParaElegirConLector | null
  // Guardado un dato: el panel cierra como al elegir el vehículo.
  alGuardado: () => void
}

// La región «Elegido» del panel del vehículo: el de la hoja, con «Quitar», el dato que se elige de una tabla de la hoja y su historial.
export function ElegidoDelPanel({ elegido, historial, alQuitar, paraElegir, alGuardado }: Props) {
  return (
    <section
      aria-label="Elegido"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-(--radius-card) border border-(--color-line) p-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Miniatura ruta={elegido.portadaRuta} className="w-12" />
        <span className="grid min-w-0 flex-1">
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Elegido</span>
          <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
        </span>
        <VerLaFicha id={elegido.id} titulo={elegido.titulo} />
        {alQuitar ? (
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alQuitar}>
            Quitar
          </Button>
        ) : null}
      </div>
      {paraElegir?.datos.map((dato) => (
        <DatoDelElegido
          key={dato.campo}
          vehiculoId={elegido.id}
          version={paraElegir.version}
          editable={paraElegir.editable}
          dato={dato}
          leerOpciones={paraElegir.leerOpciones}
          alGuardado={alGuardado}
        />
      ))}
      {historial}
    </section>
  )
}
