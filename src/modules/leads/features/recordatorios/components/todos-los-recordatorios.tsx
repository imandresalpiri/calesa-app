'use client'

import { useRegional } from '@/shared/ui/regional'
import { RecordatoriosDelLead } from './recordatorios-del-lead'

// «Ver todos tus recordatorios» (`?todos=recordatorios`): los pendientes por páginas y, a la vista, los completados, leídos desde el
// navegador al abrirse, con «Agendar» arriba. Cada cambio vuelve a leer la ficha (el aviso de vencidos y el resumen de atrás). El modal
// se dibuja dentro del drawer (Base UI lo anida: Esc cierra sólo el de arriba).
export function TodosLosRecordatorios({ leadId }: { leadId: string }) {
  const { zonaHoraria } = useRegional()
  return <RecordatoriosDelLead leadId={leadId} zona={zonaHoraria} enDrawer />
}
