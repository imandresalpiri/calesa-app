'use client'

import { useId } from 'react'
import { EditorDelMensajeDelPortal } from '@/modules/leads/client'
import { CLIENTE_DE_EJEMPLO } from '../../../entities/editor/datos-de-ejemplo'
import type { PropsDelPanelDeTextos } from '../tipos'

type Props = Pick<PropsDelPanelDeTextos, 'portal' | 'motivoDelPortal' | 'datos'>

// El Mensaje del portal (docs/GLOSARIO.md), el mismo de Configuración › Leads, editado junto al lienzo: lo dibuja y lo guarda `leads`. La vista
// previa nombra al cliente del ejemplo (o al de muestra) y a la empresa. Con `motivoDelPortal`, de sólo lectura.
export function SeccionDelMensajeDelPortal({ portal, motivoDelPortal, datos }: Props) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h3 id={idTitulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        Mensaje del portal
      </h3>
      <EditorDelMensajeDelPortal
        mensaje={portal.mensaje}
        actualizadoEn={portal.actualizadoEn}
        cliente={datos.lead?.nombre ?? CLIENTE_DE_EJEMPLO}
        empresa={datos.empresa.nombre}
        motivo={motivoDelPortal}
      />
    </section>
  )
}
