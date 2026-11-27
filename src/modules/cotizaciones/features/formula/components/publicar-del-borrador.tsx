'use client'

import { Button } from '@/shared/ui/button'
import { AccionesEnLaBarra } from '../../barra-de-la-formula/components'

type Props = {
  alPublicar: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera, con su motivo al lado.
  espera: boolean
}

export const MOTIVO_DE_PUBLICAR = 'Guarda el borrador antes de publicar: se publica lo guardado.'
export const ID_DEL_MOTIVO_DE_PUBLICAR_LA_FORMULA = 'formula-motivo-de-publicar'

// «Publicar…» del borrador al día (4.20-2b), en la barra de la fórmula (orden 2, tras «Guardar el borrador»); fuera de ella (la puesta en marcha), en su lugar. Con
// cambios aplicados sin guardar se ve apagado, con su motivo escrito al lado (`aria-describedby`): se publica lo guardado.
export function PublicarDelBorrador({ alPublicar, espera }: Props) {
  return (
    <AccionesEnLaBarra orden={2}>
      {espera ? (
        <span
          id={ID_DEL_MOTIVO_DE_PUBLICAR_LA_FORMULA}
          className="text-(length:--text-sm) text-(--color-ink-soft)"
          data-motivo-de-publicar=""
        >
          {MOTIVO_DE_PUBLICAR}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={espera}
        aria-describedby={espera ? ID_DEL_MOTIVO_DE_PUBLICAR_LA_FORMULA : undefined}
        onClick={alPublicar}
      >
        Publicar…
      </Button>
    </AccionesEnLaBarra>
  )
}
