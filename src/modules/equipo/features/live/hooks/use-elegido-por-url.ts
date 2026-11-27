'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import type { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'

type PanelPorUrl = ReturnType<typeof usePanelPorUrl>

// Un panel de Configuración › Modo Live que nombra un rol o una persona en la URL (`?panel=…&<clave>=<id>`): se revisa al llegar (lo que no está en la
// lista, o no se puede, no abre: se avisa y la URL se limpia), conserva el último elegido mientras se va y dice si ya se montó (el código diferido se
// pide la primera vez). `buscar` devuelve la fila de las props: estable entre renders.
export function useElegidoPorUrl<Fila>(
  url: PanelPorUrl,
  clave: string,
  buscar: (id: string) => Fila | null,
  motivo: (fila: Fila | null) => string | null,
) {
  const id = url.valor(clave)
  const apertura = useApertura(url.abierto)
  const encontrada = url.abierto && id !== null ? buscar(id) : null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivo(encontrada) : null,
    url.cerrar,
  )
  const vigente = rechazada ? null : encontrada
  const elegida = useUltimo(vigente)
  const montado = useAbiertoAlgunaVez(vigente !== null)
  return {
    abierto: vigente !== null,
    elegida,
    apertura,
    montado,
    abrir: (elegidaId: string) => {
      url.abrir({ [clave]: elegidaId })
    },
    cerrar: url.cerrar,
  }
}
