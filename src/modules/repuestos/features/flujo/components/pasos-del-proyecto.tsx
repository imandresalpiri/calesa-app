'use client'

import { useMemo, useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { armarPasos, type IndiceDelFlujo } from '../../../entities/flujo/pasos'
import type { LecturaDeLosPasos, PanelDelPaso } from '../../../entities/flujo/pasos-del-flujo'
import { EstadoDeLosPasos } from './estado-de-los-pasos'
import { TarjetaDelPaso } from './tarjeta-del-paso'

/** El id de la sección donde se abre el panel de una pestaña (la dibuja `src/app`). */
export const ID_DEL_PANEL_DEL_PASO = 'panel-del-paso'

type Props = {
  indice: IndiceDelFlujo | null
  estado: LecturaDeLosPasos['estado']
  // Las filas vivas de la hoja: un precio tecleado cambia el progreso sin releer nada.
  filas: readonly Pick<FilaDeItem, 'fase' | 'precioCliente'>[]
  hayMas: boolean
  // Si hay un pago vivo; nulo sin `repuestos.costos.ver`.
  pago: boolean | null
  // Los paneles que quien mira puede abrir: un hito lleva a su pestaña sólo si la tiene.
  disponibles: readonly PanelDelPaso[]
  alElegirPanel: (panel: PanelDelPaso | null) => void
  puedeConfigurar: boolean
  alReintentar: () => void
}

function FilaDePasos(props: Props & { indice: IndiceDelFlujo }) {
  const { indice, filas, hayMas, pago } = props
  const lista = useRef<HTMLOListElement>(null)
  const desborde = useDesborde(lista)
  const pasos = useMemo(
    () => armarPasos(indice, filas, { hayMas, pago }),
    [indice, filas, hayMas, pago],
  )
  const conProgreso = filas.length > 0
  return (
    <>
      {conProgreso ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Agrega ítems para ver cuántos van en cada paso.
        </p>
      )}
      {/* La `ol` es `relative`: la frase `sr-only` de cada paso es absoluta y, sin eso, escaparía de su recorte y ensancharía la página. */}
      <div className="relative min-w-0">
        <ol ref={lista} className="relative flex min-w-0 items-stretch gap-2 overflow-x-auto pb-1">
          {pasos.map((paso) => (
            <TarjetaDelPaso
              key={paso.tipo === 'fase' ? paso.fase.id : paso.hito}
              paso={paso}
              conProgreso={conProgreso}
              disponibles={props.disponibles}
              alElegirPanel={props.alElegirPanel}
            />
          ))}
        </ol>
        <PistaDeDesborde {...desborde} />
      </div>
    </>
  )
}

// La barra de progreso del proyecto (`docs/GLOSARIO.md` › «Paso (de un proyecto)»), bajo la cabecera: las fases activas del flujo de repuestos y sus hitos, con cuántos
// ítems llegaron a cada uno. Un hito lleva a su pestaña (`alElegirPanel`: la URL es de quien la usa). La fila se desplaza de costado (`min-w-0`, `PistaDeDesborde`); sin
// flujo legible dice por qué, en una línea, y los paneles siguen en sus pestañas.
export function PasosDelProyecto(props: Props) {
  const { indice, estado } = props
  return (
    <section
      aria-label="Pasos del proyecto"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
      data-pasos-del-proyecto=""
    >
      {estado === 'listo' ? null : (
        <EstadoDeLosPasos
          estado={estado}
          puedeConfigurar={props.puedeConfigurar}
          alReintentar={props.alReintentar}
        />
      )}
      {indice === null ? null : <FilaDePasos {...props} indice={indice} />}
    </section>
  )
}
