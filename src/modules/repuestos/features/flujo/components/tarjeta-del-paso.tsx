'use client'

import { ChevronRightIcon } from 'lucide-react'
import type { PasoDelProyecto } from '../../../entities/flujo/pasos'
import {
  TITULO_DEL_HITO,
  TITULO_DEL_PANEL,
  type PanelDelPaso,
} from '../../../entities/flujo/pasos-del-flujo'

type Props = {
  paso: PasoDelProyecto
  // Sin ítems, el paso va sólo con su nombre.
  conProgreso: boolean
  // Los paneles que quien mira puede abrir: el hito sólo lleva a su pestaña si la tiene.
  disponibles: readonly PanelDelPaso[]
  alElegirPanel: (panel: PanelDelPaso | null) => void
}

// Lo que se lee de un paso: el nombre, el progreso en texto y, para el lector, la frase entera («3 de 5 ítems llegaron a «Comprado»»).
function frase(paso: PasoDelProyecto): string {
  if (paso.tipo === 'fase') return `${paso.progreso.texto} ítems llegaron a «${paso.fase.nombre}»`
  return `${TITULO_DEL_HITO[paso.hito]}: ${paso.progreso.texto}`
}

// Cuánto del paso está cumplido, de 0 a 100 (con la hoja topada, lo leído: nunca un total exacto, el texto lleva el «+»).
function porcentaje({ n, total }: { n: number; total: number }): number {
  return total === 0 ? 0 : Math.min(100, Math.round((n / total) * 100))
}

const CLASE_DEL_PASO = 'grid min-w-28 flex-1 content-start gap-1 rounded-(--radius-md) px-1 py-1'

function Contenido({ paso, conProgreso }: Pick<Props, 'paso' | 'conProgreso'>) {
  const nombre = paso.tipo === 'fase' ? paso.fase.nombre : TITULO_DEL_HITO[paso.hito]
  const color = paso.tipo === 'fase' ? paso.fase.color : 'var(--color-ink-faint)'
  return (
    <>
      <span
        aria-hidden
        className={`block h-1 overflow-hidden rounded-full bg-(--color-paper-dim) ${paso.tipo === 'hito' ? 'outline-1 outline-(--color-ink-faint) outline-dashed' : ''}`}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${String(porcentaje(paso.progreso))}%`, backgroundColor: color }}
        />
      </span>
      <span
        aria-hidden={conProgreso}
        className="flex items-center gap-1 text-left font-medium [overflow-wrap:anywhere]"
      >
        {nombre}
        {paso.tipo === 'hito' ? (
          <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-(--color-ink-faint)" />
        ) : null}
      </span>
      {conProgreso ? (
        <>
          <span
            aria-hidden
            className="text-left text-(length:--text-sm) text-(--color-ink-soft) tabular-nums"
          >
            {paso.progreso.texto}
          </span>
          <span className="sr-only">{frase(paso)}</span>
        </>
      ) : null}
    </>
  )
}

// Un paso de la barra de progreso: una fase (su pista lleva el color de su fila de la base) o un hito (pista punteada y, con permiso, un botón que lleva a su
// pestaña). El progreso va siempre en texto, nunca sólo en color.
export function TarjetaDelPaso({ paso, conProgreso, disponibles, alElegirPanel }: Props) {
  const conPestana = paso.tipo === 'hito' && disponibles.includes(paso.panel)
  return (
    <li
      data-paso={paso.tipo === 'fase' ? paso.fase.id : paso.hito}
      data-tipo-de-paso={paso.tipo}
      className="flex min-w-0 shrink-0 grow basis-28"
    >
      {paso.tipo === 'hito' && conPestana ? (
        <button
          type="button"
          data-panel-del-paso={paso.panel}
          aria-label={`${conProgreso ? frase(paso) : TITULO_DEL_HITO[paso.hito]}. Abrir ${TITULO_DEL_PANEL[paso.panel]}`}
          className={`${CLASE_DEL_PASO} min-h-11 cursor-pointer transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none md:min-h-0`}
          onClick={() => {
            alElegirPanel(paso.panel)
          }}
        >
          <Contenido paso={paso} conProgreso={conProgreso} />
        </button>
      ) : (
        <div className={CLASE_DEL_PASO}>
          <Contenido paso={paso} conProgreso={conProgreso} />
        </div>
      )}
    </li>
  )
}
