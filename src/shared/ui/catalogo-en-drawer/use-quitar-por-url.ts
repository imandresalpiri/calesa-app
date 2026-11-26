'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// `?panel=<panel>&quitar=<id>`: el diálogo de «Quitar» vive en su propia clave y deja el `?panel=` del drawer como está. Se monta una
// vez en el cuerpo del drawer. Un id que ya no está en la lista (otra persona lo quitó, un enlace viejo) avisa y limpia la URL.
export const CLAVE_DE_QUITAR = 'quitar'

const PARSERS = { [CLAVE_DE_QUITAR]: parseAsString }

export function useQuitarPorUrl(lista: readonly ElementoDeCatalogo[], motivoAusente: string) {
  const [valores, escribir] = useQueryStates(PARSERS)
  const id = valores[CLAVE_DE_QUITAR]
  const pedido = id !== null
  useVueltaDelFoco(CLAVE_DE_QUITAR, pedido)
  const apertura = useApertura(pedido)
  const cerrar = () => {
    void escribir({ [CLAVE_DE_QUITAR]: null })
  }
  const rechazada = useRevisionAlAbrir(
    pedido ? `${String(apertura)}:${id}` : null,
    pedido && !lista.some((elemento) => elemento.id === id) ? motivoAusente : null,
    cerrar,
  )
  const vigente =
    pedido && !rechazada ? (lista.find((elemento) => elemento.id === id) ?? null) : null
  return {
    abierto: vigente !== null,
    // Mientras se cierra, el último que mostró.
    elemento: useUltimo(vigente),
    abrir: (elementoId: string) => {
      abrirConVuelta(
        CLAVE_DE_QUITAR,
        () => escribir({ [CLAVE_DE_QUITAR]: elementoId }, { history: 'push' }),
        pedido,
      )
    },
    cerrar,
  }
}
