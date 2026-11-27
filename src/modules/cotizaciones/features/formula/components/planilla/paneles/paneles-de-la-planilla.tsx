'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { Planilla } from '../../../hooks/use-planilla'
import type { PropsDeLaPlanilla } from '../tipos'
import {
  PanelComoSeEscribeDiferido,
  PanelDeLaBandaDiferido,
  PanelDeDecimalesDiferido,
  PanelDeLaTarjetaDiferido,
  PanelDeLosTotalesDiferido,
  PanelDelTipoDeCeldaDiferido,
  PanelDelTotalDiferido,
} from './diferidos'

// Los que editan, montados desde que se abren; en sólo lectura (Modo Live) ninguno: sólo quedan los que miran («Totales», la tarjeta y «¿Cómo se escribe?»).
function useLosQueEditan(paneles: Planilla['paneles'], edita: boolean) {
  return {
    banda: useAbiertoAlgunaVez(edita && (paneles.banda.abierto || paneles.nuevaBanda.abierto)),
    total: useAbiertoAlgunaVez(edita && paneles.total.abierto),
    tipo: useAbiertoAlgunaVez(edita && paneles.tipo.abierto),
    decimales: useAbiertoAlgunaVez(edita && paneles.decimales.abierto),
  }
}

// Los paneles de la planilla, montados una vez cada uno desde que se abren (el código llega con la primera apertura y el panel se desliza al cerrar).
export function PanelesDeLaPlanilla({ p, planilla }: { p: PropsDeLaPlanilla; planilla: Planilla }) {
  const { paneles } = planilla
  const { banda, total, tipo, decimales } = useLosQueEditan(paneles, !planilla.editor.soloLectura)
  const ayuda = useAbiertoAlgunaVez(paneles.ayuda.abierto)
  const totales = useAbiertoAlgunaVez(paneles.totales.abierto)
  const tarjeta = useAbiertoAlgunaVez(paneles.tarjeta.abierto)
  return (
    <>
      {banda ? <PanelDeLaBandaDiferido planilla={planilla} NuevoColor={p.NuevoColor} /> : null}
      {total ? <PanelDelTotalDiferido planilla={planilla} /> : null}
      {tipo ? (
        <PanelDelTipoDeCeldaDiferido
          planilla={planilla}
          origen={p.origen}
          tiposDeCambio={p.tiposDeCambio}
        />
      ) : null}
      {decimales ? <PanelDeDecimalesDiferido planilla={planilla} /> : null}
      {ayuda ? <PanelComoSeEscribeDiferido planilla={planilla} /> : null}
      {totales ? <PanelDeLosTotalesDiferido p={p} planilla={planilla} /> : null}
      {tarjeta ? <PanelDeLaTarjetaDiferido p={p} planilla={planilla} /> : null}
    </>
  )
}
