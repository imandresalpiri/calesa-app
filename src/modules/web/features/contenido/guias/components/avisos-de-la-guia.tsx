'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'

type Props = { conflicto: string | null; alRecargar: () => void; enLinea: boolean }

// Los avisos de la página de la guía, sobre el artículo y flotando: el lugar de arriba está reservado, así que aparecer o irse no empuja el texto.
export function AvisosDeLaGuia({ conflicto, alRecargar, enLinea }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 grid gap-2 px-4">
      {enLinea ? null : (
        <div className="pointer-events-auto">
          <Aviso tono="aviso">
            Sin conexión: tu borrador queda aquí y se guarda cuando vuelva.
          </Aviso>
        </div>
      )}
      {conflicto ? (
        <div className="pointer-events-auto">
          <AvisoDeConflicto mensaje={conflicto} alRecargar={alRecargar} />
        </div>
      ) : null}
    </div>
  )
}
