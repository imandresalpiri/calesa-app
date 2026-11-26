'use client'

import { use, type ReactNode } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { pasosDeLaHoja } from '../../../entities/pasos-de-la-hoja'
import { PANEL_DE_VISTA_PREVIA } from '../hooks/urls-de-la-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'

// Cada paso es una píldora con borde: 44 px en el celular (32 con puntero fino desde `md`).
const PASO =
  'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) font-medium text-(--color-ink) md:pointer-fine:min-h-8'

// «Vista previa»: abre la tarjeta por la URL (`?panel=vista-previa`). **Fuera del orden de Tab** (`tabIndex -1`): la tarea de oro «cotizar» no suma paradas; con el
// teclado se llega, en la hoja nueva, por el botón del final del cierre (`VistaPreviaConElTeclado`) y, en una guardada, por el «⋯».
function PasoDeLaVistaPrevia({ etiqueta, panel }: { etiqueta: string; panel: string }) {
  const abrir = usePanelPorUrl(panel).abrir
  return (
    <button
      type="button"
      data-paso="vista_previa"
      tabIndex={-1}
      className={`${PASO} transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none`}
      onClick={() => {
        abrir()
      }}
    >
      {etiqueta}
    </button>
  )
}

// Los pasos de la hoja (docs/GLOSARIO.md › «Pasos de la hoja»): «Privada · Vista previa», arriba de las secciones. «Privada» es el interruptor mismo
// (`InterruptorPrivada`, que pasa sólo la hoja nueva a quien puede marcarla): es un control de formulario y va en el orden de Tab. «Vista previa», sólo con
// `ContextoDeLaVistaPrevia`. Sin ninguno de los dos, la fila no se dibuja. Su alto es fijo: encender «Privada» no mueve nada.
export function PasosDeLaHoja({ privada }: { privada: ReactNode }) {
  const conVistaPrevia = use(ContextoDeLaVistaPrevia) !== null
  const lista = pasosDeLaHoja({
    privada: privada !== null && privada !== undefined,
    vistaPrevia: conVistaPrevia ? PANEL_DE_VISTA_PREVIA : null,
  })
  if (lista.length === 0) {
    return null
  }
  return (
    <nav
      aria-label="Pasos de la hoja"
      data-pasos-de-la-hoja=""
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      {lista.map((paso) =>
        paso.panel === null ? (
          <div key={paso.clave} data-paso={paso.clave} className={PASO}>
            {privada}
          </div>
        ) : (
          <PasoDeLaVistaPrevia key={paso.clave} etiqueta={paso.etiqueta} panel={paso.panel} />
        ),
      )}
    </nav>
  )
}
