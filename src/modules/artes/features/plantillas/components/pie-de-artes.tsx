'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'

// Lo que sigue a una rejilla de Artes (plantillas o imágenes): el error del último pedido con «Reintentar», el aviso del tope o «Ver más».
// Mientras pide, el botón dice «Cargando…» y no se puede volver a tocar.
type Props = {
  carga: {
    cargando: boolean
    error: { mensaje: string } | null
    enElTope: boolean
    hayMasParaPedir: boolean
    verMas: () => void
  }
  tope: string
}

export function PieDeArtes({ carga, tope }: Props) {
  if (carga.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{carga.error.mensaje}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={carga.cargando}
          onClick={carga.verMas}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (carga.enElTope) {
    return <AvisoDeTope texto={tope} />
  }
  if (!carga.hayMasParaPedir) {
    return null
  }
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto md:min-h-9"
        disabled={carga.cargando}
        onClick={carga.verMas}
      >
        {carga.cargando ? 'Cargando…' : 'Ver más'}
      </Button>
    </div>
  )
}
