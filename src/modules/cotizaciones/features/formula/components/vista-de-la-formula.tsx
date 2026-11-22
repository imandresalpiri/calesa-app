'use client'

import type { LecturaDeLaFormula as Formula } from '../../../entities/formula/versiones'
import { useEnLaBarra } from '../../barra-de-la-formula/components'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ListaDeVersiones } from './lista-de-versiones'
import { TarjetaDeLaPublicada } from './tarjeta-de-la-publicada'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'
import { DrawerDeLasVersiones } from './versiones/drawer-de-las-versiones'

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

// Lo de arriba de la pestaña «Planilla»: la publicada de la fórmula, su borrador y sus versiones (en la barra de la fórmula, en su drawer). Se edita en la planilla, debajo.
export function VistaDeLaFormula({
  origen,
  formula,
  panel,
  publicarEspera,
  publicarEnLaBarra = false,
}: Props) {
  const enLaBarra = useEnLaBarra()
  // Con otra fórmula de trabajo u otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor.
  const versiones = (
    <ListaDeVersiones
      key={`${origen.id}:${formula.formulaDelOrigen?.id ?? ''}:${formula.publicada?.id ?? ''}`}
      formulaDelOrigenId={formula.formulaDelOrigen?.id ?? null}
      inicial={formula.versiones}
      conPublicada={formula.publicada !== null}
      alRevertir={panel.abrirRevertir}
    />
  )
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
      {/* En la página del origen la lista va en el drawer «Versiones» de la barra; en la puesta en marcha, aquí. */}
      {enLaBarra ? <DrawerDeLasVersiones>{versiones}</DrawerDeLasVersiones> : versiones}
    </>
  )
}
