'use client'

import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { Drawer } from '@/shared/ui/drawer'
import type { Planilla } from '../../../hooks/use-planilla'
import { ID_DEL_COSTADO } from '../barra/ids-del-costado'
import { TarjetaDeLaUnidad } from '../tarjeta-de-la-unidad'
import type { PropsDeLaPlanilla } from '../tipos'

// «Tarjeta de la cotización» (`?costado=tarjeta`): la tarjeta en vivo con la unidad de ejemplo. Desde 1024 px va al costado y no es modal (la tarjeta cambia con
// cada cambio de la planilla); más angosto, el drawer modal de siempre. Se pide recién al abrirlo (`diferidos.tsx`).
export function PanelDeLaTarjeta({ p, planilla }: { p: PropsDeLaPlanilla; planilla: Planilla }) {
  const { tarjeta } = planilla.paneles
  return (
    <Drawer
      abierto={tarjeta.abierto}
      alCerrar={tarjeta.cerrar}
      titulo="Tarjeta de la cotización"
      descripcion="Con la unidad de ejemplo."
      ancho="amplio"
      alCostado={useAlMenos(CORTE_DEL_PANEL)}
    >
      <div id={ID_DEL_COSTADO.tarjeta}>
        <TarjetaDeLaUnidad
          origenId={p.origen.id}
          formulaDelOrigenId={p.formulaDelOrigenId}
          tarjeta={p.tarjeta}
          TarjetaEnVivo={p.TarjetaEnVivo}
          vista={planilla.calculo.vista}
          modos={planilla.calculo.modos}
          modo={p.modo}
          alElegirModo={p.alElegirModo}
          verTotalBs={planilla.verTotalBs}
        />
      </div>
    </Drawer>
  )
}
