'use client'

import { useState } from 'react'
import type { DestinoAlQuitar, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Envio } from '@/shared/lib/enviar-accion'

export const SIN_DESTINO = ''

// El estado del diálogo «Quitar»: a dónde van sus ítems y lo que respondió la base. Con ítems (los que se ven, o los que la base
// encontró al intentarlo: `porCampo.items`), quitar los mueve antes al destino elegido.
export function useConfirmarQuitar(args: {
  elemento: ElementoDeCatalogo | null
  usos: ReadonlyMap<string, number>
  cerrar: () => void
  alQuitar: (elemento: ElementoDeCatalogo, destino: DestinoAlQuitar) => Promise<Envio<unknown>>
}) {
  const [destino, setDestino] = useState(SIN_DESTINO)
  const [pideMover, setPideMover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDestino, setErrorDestino] = useState<string | undefined>(undefined)
  const n = args.elemento ? (args.usos.get(args.elemento.id) ?? 0) : 0
  const conItems = n > 0 || pideMover

  function cerrar() {
    setDestino(SIN_DESTINO)
    setPideMover(false)
    setError(null)
    setErrorDestino(undefined)
    args.cerrar()
  }

  async function confirmar() {
    if (!args.elemento) {
      return
    }
    setError(null)
    setErrorDestino(undefined)
    const envio = await args.alQuitar(
      args.elemento,
      conItems
        ? { mover: true, destino: destino === SIN_DESTINO ? null : destino }
        : { mover: false },
    )
    if (envio.ok) {
      cerrar()
      return
    }
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    if (porCampo?.['items']) {
      setPideMover(true)
      setError(porCampo['items'])
    } else if (porCampo?.['destino']) {
      setErrorDestino(porCampo['destino'])
    } else {
      setError(envio.error.mensaje)
    }
  }

  return {
    n,
    conItems,
    destino,
    elegirDestino: (valor: string) => {
      setDestino(valor)
      setErrorDestino(undefined)
    },
    error,
    errorDestino,
    cerrar,
    confirmar,
  }
}
