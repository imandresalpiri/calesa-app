'use client'

import type { LecturaDeLaFormula } from '../../../../entities/formula/versiones'
import { useEnLaBarra } from '../../../barra-de-la-formula/components'
import type { PanelDeLaFormula } from '../../hooks/use-panel-de-la-formula'
import { ListaDeVersiones } from '../lista-de-versiones'
import { DrawerDeLasVersiones } from './drawer-de-las-versiones'

type Props = { origenId: string; formula: LecturaDeLaFormula; panel: PanelDeLaFormula }

// Las versiones de la fórmula: en la página del origen, en el drawer «Versiones» de la barra; en la puesta en marcha, en su lugar. Con otra fórmula de trabajo u
// otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor.
export function VersionesDeLaFormula({ origenId, formula, panel }: Props) {
  const enLaBarra = useEnLaBarra()
  const versiones = (
    <ListaDeVersiones
      key={`${origenId}:${formula.formulaDelOrigen?.id ?? ''}:${formula.publicada?.id ?? ''}`}
      formulaDelOrigenId={formula.formulaDelOrigen?.id ?? null}
      inicial={formula.versiones}
      conPublicada={formula.publicada !== null}
      alRevertir={panel.abrirRevertir}
    />
  )
  return enLaBarra ? <DrawerDeLasVersiones>{versiones}</DrawerDeLasVersiones> : versiones
}
