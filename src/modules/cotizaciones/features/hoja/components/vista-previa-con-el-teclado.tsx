'use client'

import { use } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_VISTA_PREVIA } from '../hooks/urls-de-la-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'

// «Vista previa» para el teclado en la hoja nueva. El paso «Vista previa» va fuera del orden de Tab (la tarea de oro «cotizar» no suma paradas antes de las celdas) y
// una guardada la tiene en el «⋯»; este botón va al final del cierre, después de «Guardar» (donde estaba el del resumen), y se ve sólo cuando le llega el foco. Sin
// `ContextoDeLaVistaPrevia`, nada.
export function VistaPreviaConElTeclado() {
  return use(ContextoDeLaVistaPrevia) === null ? null : <BotonDeLaVistaPrevia />
}

function BotonDeLaVistaPrevia() {
  const abrir = usePanelPorUrl(PANEL_DE_VISTA_PREVIA).abrir
  return (
    <button
      type="button"
      data-vista-previa-con-el-teclado=""
      className="sr-only focus-visible:not-sr-only focus-visible:inline-flex focus-visible:min-h-[44px] focus-visible:items-center focus-visible:justify-self-start focus-visible:rounded-(--radius-md) focus-visible:border focus-visible:border-(--color-line) focus-visible:bg-(--color-surface) focus-visible:px-3 focus-visible:text-(length:--text-sm) focus-visible:font-medium focus-visible:shadow-(--shadow-focus) focus-visible:outline-none md:pointer-fine:focus-visible:min-h-8"
      onClick={() => {
        abrir()
      }}
    >
      Vista previa
    </button>
  )
}
