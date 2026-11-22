'use client'

import type { LecturaDeLaFormula as Formula } from '../../../entities/formula/versiones'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ListaDeVersiones } from './lista-de-versiones'
import { TarjetaDeLaPublicada } from './tarjeta-de-la-publicada'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'

type Props = {
  origen: Origen
  formula: Formula
  panel: PanelDeLaFormula
  // Hay cambios aplicados en la planilla sin guardar: «Publicar…» espera.
  publicarEspera: boolean
  // «Publicar…» del borrador va en la barra de la fórmula (la página del origen).
  publicarEnLaBarra?: boolean
}

type Origen = { id: string; nombre: string; activo: boolean }

// Lo de arriba de la pestaña «Fórmula» (4.20-2a): la publicada del origen, su borrador y sus versiones (el origen se elige en la página). Se edita en la planilla, debajo.
export function VistaDeLaFormula({
  origen,
  formula,
  panel,
  publicarEspera,
  publicarEnLaBarra = false,
}: Props) {
  return (
    <>
      <TarjetaDeLaPublicada publicada={formula.publicada} origen={origen.nombre} />
      {formula.borrador ? (
        <TarjetaDelBorrador
          borrador={formula.borrador}
          publicada={formula.publicada}
          alPublicar={panel.abrirPublicar}
          alDescartar={panel.abrirDescartar}
          publicarEspera={publicarEspera}
          publicarEnLaBarra={publicarEnLaBarra}
        />
      ) : null}
      {/* Con otra fórmula de trabajo u otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor. */}
      <ListaDeVersiones
        key={`${origen.id}:${formula.formulaDelOrigen?.id ?? ''}:${formula.publicada?.id ?? ''}`}
        formulaDelOrigenId={formula.formulaDelOrigen?.id ?? null}
        inicial={formula.versiones}
        conPublicada={formula.publicada !== null}
        alRevertir={panel.abrirRevertir}
      />
    </>
  )
}
