'use client'

import type { RefObject } from 'react'
import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { Drawer } from '@/shared/ui/drawer'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'
import { panelDeLaSeleccion } from '../../../../../entities/plantilla/paneles-del-editor'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import type { EditorDeLaCuadricula } from '../../../hooks/use-editor-de-la-cuadricula'
import { usePedidoAlPanel, type PedidoAlPanel } from '../../../hooks/use-pedido-al-panel'
import type { PanelDeLaTarjeta } from '../../../hooks/use-panel-de-la-tarjeta'
import { PanelDelEditor } from './panel-del-editor'

type Props = {
  panel: PanelDeLaTarjeta
  editor: EditorDeLaCuadricula
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  nombrados: ReadonlySet<string>
  ocupado: boolean
  enfoque: RefObject<HTMLDivElement | null>
  pedido: PedidoAlPanel | null
  alAtender: () => void
}

// El panel del editor al costado del lienzo (`?panel=celda|columnas`): «Celda» o «Fila» según lo elegido y «Columnas». Desde 1.024 px va al costado y no es modal (elegir
// otra celda en el lienzo sigue valiendo y el panel la sigue); más angosto, el cajón de siempre. Cerrarlo no pregunta; con una regla a medio armar sí (`useBorradorDeLaRegla`
// lo avisa con `useCambiosSinGuardar()`). Se pide recién al abrirlo (`diferidos.tsx`).
export function DrawerDelPanel({ panel, editor, pedido, alAtender, enfoque, ...resto }: Props) {
  const alCostado = useAlMenos(CORTE_DEL_PANEL)
  const sel = editor.estado.seleccion
  const de = panelDeLaSeleccion(sel)
  const abierto = panel.celda || panel.columnas
  usePedidoAlPanel(abierto ? pedido : null, enfoque, alAtender)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.cerrar}
      titulo={panel.columnas ? 'Columnas' : de.nombre}
      alCostado={alCostado}
    >
      <PanelDelEditor
        cual={panel.columnas ? 'columnas' : 'celda'}
        editor={editor}
        enfoque={enfoque}
        {...resto}
      />
    </Drawer>
  )
}
