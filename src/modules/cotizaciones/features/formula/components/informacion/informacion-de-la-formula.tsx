'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { PANEL_DE_LA_INFORMACION } from '../../../../entities/informacion-de-la-formula'
import type { LecturaDeLaFormula } from '../../../../entities/formula/versiones'
import type { AvisosDeLaCopia } from '../../hooks/use-avisos-de-la-copia'
import { ModalDeLaInformacionDiferido } from './diferidos'

type Props = {
  origen: { id: string; nombre: string }
  formulaDelOrigenId: string
  formula: LecturaDeLaFormula
  avisos: AvisosDeLaCopia
  alDescartar: () => void
}

// El modal «Información de la fórmula», en la URL (`?panel=info-formula`: recargar lo deja abierto, «atrás» lo cierra). Se monta la primera vez que se abre.
export function InformacionDeLaFormula(props: Props) {
  const panel = usePanelPorUrl(PANEL_DE_LA_INFORMACION)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  return montado ? (
    <ModalDeLaInformacionDiferido abierto={panel.abierto} alCerrar={panel.cerrar} {...props} />
  ) : null
}
