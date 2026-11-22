'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_PERSONA,
  PANEL_EDITAR_EN_LA_RUEDA,
  PANEL_QUITAR_DE_LA_RUEDA,
} from '../../../../entities/cola/paneles'
import { motivoParaNoAbrirPersona } from '../../../../entities/cola/rueda'
import type { FilaDelTablero } from '../../../../entities/cola/tablero'

// Un panel de una persona de la rueda en la URL (`?panel=<panel>&para=<usuarioId>`): se puede recargar y «atrás» lo cierra. Alguien que no está en la rueda no
// abre (se avisa y la URL se limpia, escrita a mano también), pero sólo se revisa al llegar: si con el panel abierto la persona sale de la rueda, el panel
// conserva la última fila que vio y `sigue` pasa a falso (quien lo dibuja dice por qué ya no se guarda).
function usePanelDePersona(panel: string, filas: readonly FilaDelTablero[]) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_PERSONA])
  const id = url.valor(CLAVE_DE_PERSONA)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoAbrirPersona(filas, id) : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? (filas.find((f) => f.usuarioId === id) ?? null) : null
  const fila = useUltimo(vigente)
  const seAbre = url.abierto && !rechazada && fila !== null
  return {
    abierto: seAbre,
    // La persona del panel (la última que se vio, mientras el panel se va).
    fila,
    // Sigue habilitada en la rueda ahora mismo.
    sigue: vigente !== null,
    montar: useAbiertoAlgunaVez(seAbre),
    abrir: (usuarioId: string) => {
      url.abrir({ [CLAVE_DE_PERSONA]: usuarioId })
    },
    cerrar: url.cerrar,
  }
}

// Los dos paneles de una persona de la rueda, que se montan una vez en el bloque y no una por tarjeta: «Editar…» y «Quitar de la rueda».
export function usePanelesDeLaRueda(filas: readonly FilaDelTablero[]) {
  return {
    editar: usePanelDePersona(PANEL_EDITAR_EN_LA_RUEDA, filas),
    quitar: usePanelDePersona(PANEL_QUITAR_DE_LA_RUEDA, filas),
  }
}
