'use client'

import { PanelDeTurnosDiferido, PANEL_DE_TURNOS } from '@/modules/web/pantallas/turnos-inicio'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

type Props = {
  // El título y la frase de vacío salen del bloque de Inicio (`bloqueVisible()`): una sola fuente.
  titulo: string
  vacio: string
  // `leads.ver`: lo decide `page.tsx` con `puede()`, nunca el cliente.
  puedeVincular: boolean
}

// «Ver todos» del bloque «Turnos de la web sin confirmar» sobre Inicio: `?panel=turnos`. El código del panel (y con él su lectura) llega recién al abrirlo la primera vez, así que
// el JS de `/` no crece en frío. «Vincular a lead» sigue montado por `vincular-turno.tsx`: abre `?panel=vincular-turno`, que reemplaza a éste (con «atrás» se vuelve).
export function PanelDeTurnos({ titulo, vacio, puedeVincular }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_TURNOS)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  if (!montado) {
    return null
  }
  return (
    <PanelDeTurnosDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo={titulo}
      vacio={vacio}
      puedeVincular={puedeVincular}
    />
  )
}
