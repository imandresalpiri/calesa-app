'use client'

import { parseAsString, useQueryState } from 'nuqs'
import type { LeadDeFicha } from '../../../entities/ficha'
import { CLAVE_DE_TODOS } from '../../../entities/bloques-de-la-ficha'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { EdicionDeLaFicha } from './edicion-de-la-ficha'
import { PanelDeTelefono } from './panel-de-telefono'
import { RefrescarAlVolver } from './refrescar-al-volver'

type Props = {
  ficha: LeadDeFicha
  puedeEditar: boolean
  puedeCambiarTelefono: boolean
  puedeEditarExtras: boolean
  puedeConfigurar: boolean
  etiquetas: Etiquetas
  // «Gestionar» etiquetas está abierto.
  gestionando: boolean
}

// Lo que se abre encima de la ficha: editar el lead (o sólo sus teléfonos), cambiar el principal y gestionar etiquetas, cada uno en su
// `?panel=`. Con ningún panel ni «Ver todos» abiertos, la ficha se vuelve a leer al volver a la pestaña (con uno, reiniciaría lo escrito).
export function PanelesDeLaFicha({
  ficha,
  puedeEditar,
  puedeCambiarTelefono,
  puedeEditarExtras,
  puedeConfigurar,
  etiquetas,
  gestionando,
}: Props) {
  const panel = usePanelDeLead()
  const [todos] = useQueryState(CLAVE_DE_TODOS, parseAsString)
  return (
    <>
      <EdicionDeLaFicha
        ficha={ficha}
        puedeEditar={puedeEditar}
        puedeEditarExtras={puedeEditarExtras}
        puedeConfigurar={puedeConfigurar}
        puedeCambiarTelefono={puedeCambiarTelefono}
      />
      <PanelDeTelefono ficha={ficha} puedeCambiar={puedeCambiarTelefono} />
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      <RefrescarAlVolver activo={!panel.hayPanel && !gestionando && todos === null} />
    </>
  )
}
