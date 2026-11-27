'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import type { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'

type PanelPorUrl = ReturnType<typeof usePanelPorUrl>

// Un modal o una confirmación sobre una fila de Artes, en la URL (`?panel=<panel>&<clave>=<id>`, de `usePanelPorUrl(panel, [clave])` en quien
// lo abre): se puede recargar y «atrás» lo cierra. Se monta una vez en la pestaña. Una fila que no está en lo cargado no abre (se avisa con
// `mensaje` y la URL se limpia); mientras se va, el diálogo conserva la última que vio.
export function useFilaPorUrl<Fila>(
  url: PanelPorUrl,
  clave: string,
  porId: (id: string | null) => Fila | null,
  mensaje: string,
) {
  const id = url.valor(clave)
  const apertura = useApertura(url.abierto)
  const vigente = porId(id)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && vigente === null ? mensaje : null,
    url.cerrar,
  )
  const fila = useUltimo(url.abierto && !rechazada ? vigente : null)
  return {
    abierto: url.abierto && !rechazada && vigente !== null,
    fila,
    // Cambia en cada apertura: la `key` de un modal que empieza de cero.
    apertura: `${String(apertura)}:${id ?? ''}`,
    abrir: (filaId: string) => {
      url.abrir({ [clave]: filaId })
    },
    cerrar: url.cerrar,
  }
}
