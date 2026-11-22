'use client'

import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { Drawer } from '@/shared/ui/drawer'
import type { Planilla } from '../../../hooks/use-planilla'
import { ID_DEL_COSTADO } from '../barra/ids-del-costado'
import { TotalesDeLaUnidad } from '../totales-de-la-unidad'
import type { PropsDeLaPlanilla } from '../tipos'

// «Totales» (`?costado=totales`): el total con la unidad de ejemplo y el modo elegido. Desde 1024 px va al costado y no es modal (la planilla se sigue editando y
// los totales se mueven con cada cambio); más angosto, el drawer modal de siempre. Se pide recién al abrirlo (`diferidos.tsx`).
export function PanelDeLosTotales({ p, planilla }: { p: PropsDeLaPlanilla; planilla: Planilla }) {
  const { totales } = planilla.paneles
  const { editor } = p
  return (
    <Drawer
      abierto={totales.abierto}
      alCerrar={totales.cerrar}
      titulo="Totales"
      descripcion="Con la unidad de ejemplo."
      alCostado={useAlMenos(CORTE_DEL_PANEL)}
    >
      <div id={ID_DEL_COSTADO.totales}>
        <TotalesDeLaUnidad
          lectura={editor.lectura}
          vista={planilla.calculo.vista}
          lineas={planilla.calculo.lineas}
          rechazo={editor.rechazo}
          nombreDelOrigen={p.origen.nombre}
          alReintentar={editor.reintentarLaLectura}
        />
      </div>
    </Drawer>
  )
}
