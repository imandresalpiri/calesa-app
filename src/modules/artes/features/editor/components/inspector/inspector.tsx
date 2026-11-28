'use client'

// El inspector del editor de artes, el panel derecho: llena su celda de la rejilla (`CELDAS_DEL_EDITOR.derecha`, la columna de 19 rem con
// su borde) a todo el alto. Arriba, en la fila de 40 px que ocuparán sus pestañas (la de «Textos» llega con el editor con datos), «Diseño»;
// abajo, lo de lo elegido (`ContenidoDelInspector`), que se desplaza adentro: elegir otra cosa no cambia el tamaño del panel ni corre el
// lienzo. Cada elección empieza con sus campos de cero. En sólo lectura todo se ve y nada se cambia.
import { useId } from 'react'
import { TITULOS_DEL_PANEL_DERECHO } from '../../../../entities/editor/paneles'
import type { PropsDelInspector } from '../../tipos'
import { ContenidoDelInspector } from './contenido-del-inspector'

export function Inspector({ editor, logos, formato }: PropsDelInspector) {
  const idDelTitulo = useId()
  return (
    <aside aria-labelledby={idDelTitulo} className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-(--color-line) px-3">
        <h2 id={idDelTitulo} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          {TITULOS_DEL_PANEL_DERECHO.diseno}
        </h2>
      </div>
      <div
        key={editor.estado.seleccion.join(',')}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ContenidoDelInspector editor={editor} logos={logos} formato={formato} />
      </div>
    </aside>
  )
}
