'use client'

import { Button } from '@/shared/ui/button'
import { avisoDelPeso } from '../../../entities/documentos/admision'
import { formatearBytes } from '../../../entities/documentos/tamano'
import type { EntradaDeLaBandeja } from '../hooks/use-bandeja'
import { MiniaturaLocal } from './miniatura-local'

type Props = {
  entrada: EntradaDeLaBandeja
  // Por qué no se pudo subir la última vez, si falló.
  motivo?: string
  deshabilitado: boolean
  alQuitar: () => void
  // Tocar el archivo lo abre en la vista previa (sólo para ver).
  alVer: () => void
}

// Un archivo de la bandeja: su miniatura, su nombre, su peso, el aviso si es pesado y «Quitar»; tocarlo lo abre en la vista previa. Todavía no se subió: sale de la lista sin dejar rastro.
export function FilaDeLaBandeja({ entrada, motivo, deshabilitado, alQuitar, alVer }: Props) {
  const { nombre, bytes } = entrada.datos
  const aviso = avisoDelPeso(bytes)
  return (
    <li className="grid gap-1 rounded-(--radius-md) border border-(--color-line) px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="focus-visible:ring-ring flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-(--radius-md) text-left outline-none focus-visible:ring-3"
          aria-label={`Ver ${nombre}`}
          onClick={alVer}
        >
          <MiniaturaLocal entrada={entrada} />
          <span className="min-w-0">
            <span className="block font-medium break-words">{nombre}</span>
            <span className="block text-(length:--text-sm) text-(--color-ink-soft)">
              {formatearBytes(bytes)}
            </span>
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-9"
          aria-label={`Quitar ${nombre}`}
          disabled={deshabilitado}
          onClick={alQuitar}
        >
          Quitar
        </Button>
      </div>
      {aviso ? <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{aviso}</p> : null}
      {motivo ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </li>
  )
}
