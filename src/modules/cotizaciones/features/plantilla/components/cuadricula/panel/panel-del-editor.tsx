'use client'

import type { RefObject } from 'react'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'
import { panelDeLaSeleccion } from '../../../../../entities/plantilla/paneles-del-editor'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import type { EditorDeLaCuadricula } from '../../../hooks/use-editor-de-la-cuadricula'
import { PanelDeLaCelda } from './panel-de-la-celda'
import { PanelDeLaFila } from './panel-de-la-fila'
import { PanelResumen } from './panel-resumen'

type Props = {
  // `columnas`: el resumen; `celda`: lo elegido (la celda, las columnas o la fila).
  cual: 'columnas' | 'celda'
  editor: EditorDeLaCuadricula
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  nombrados: ReadonlySet<string>
  ocupado: boolean
  enfoque: RefObject<HTMLDivElement | null>
}

// El contenido del panel que se abre al costado del lienzo (`<DrawerDelPanel>`): «Columnas» (el resumen) o lo elegido: filas, la fila; celdas o columnas, la celda
// (aplicado a todas); sin nada elegido, lo dice. Mientras se guarda, apagado.
export function PanelDelEditor({
  cual,
  editor,
  contexto,
  tonos,
  nombrados,
  ocupado,
  enfoque,
}: Props) {
  const { estado, plantilla, mapa, hacer } = editor
  const sel = estado.seleccion
  const de = panelDeLaSeleccion(sel).contenido
  return (
    <aside aria-label="Panel de la tarjeta" className="min-w-0" data-panel-del-editor="">
      <fieldset disabled={ocupado} className="grid min-w-0 gap-4">
        {cual === 'columnas' ? (
          <PanelResumen
            plantilla={plantilla}
            tonos={tonos}
            bytes={editor.bytes}
            hacer={hacer}
            ocupado={ocupado}
          />
        ) : sel === null || de === 'nada' ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)" data-panel-sin-elegir="">
            Elige una celda o una fila para ver su panel.
          </p>
        ) : sel.tipo === 'filas' ? (
          <PanelDeLaFila
            plantilla={plantilla}
            fila={Math.min(sel.desde, sel.hasta)}
            contexto={contexto}
            nombrados={nombrados}
            hacer={hacer}
          />
        ) : (
          <PanelDeLaCelda
            plantilla={plantilla}
            mapa={mapa}
            seleccion={sel}
            contexto={contexto}
            tonos={tonos}
            nombrados={nombrados}
            enfoque={enfoque}
            hacer={hacer}
          />
        )}
      </fieldset>
    </aside>
  )
}
