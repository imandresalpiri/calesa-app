'use client'

import { avisarExito } from '@/shared/ui/toasts'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useMensajeDelPortal } from './use-mensaje-del-portal'

type Opciones = {
  portal: AjustesDeLeads['portal']
  abierto: boolean
  alCerrar: () => void
}

// El mensaje del portal en su modal (`useMensajeDelPortal()`, sin borrador: cada apertura empieza de lo guardado). Un conflicto ofrece
// «Recargar» y lo escrito queda; en blanco no se guarda: volver al de fábrica es «Restablecer», que confirma. Sin cambios, guardar cierra.
export function useModalDelMensajeDelPortal({ portal, abierto, alCerrar }: Opciones) {
  return useMensajeDelPortal({
    mensaje: portal.mensaje,
    actualizadoEn: portal.actualizadoEn,
    abierto,
    alGuardar: () => {
      avisarExito('Mensaje del portal guardado.')
      alCerrar()
    },
  })
}
