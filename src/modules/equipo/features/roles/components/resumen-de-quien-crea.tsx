'use client'

import { ChevronRightIcon } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { useId, useState } from 'react'
import { cn } from 'cn'
import type { Permisos } from '@/shared/lib/permisos'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { OrigenDeLaMatriz } from '../../../entities/matriz'
import type { RolConConcesiones } from '../../../entities/rol'
import type { VersionesDeRoles } from '../hooks/use-versiones-de-roles'
import { QuienCreaYQuienVeDiferido } from './diferidos'

type Props = {
  roles: readonly RolConConcesiones[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  versiones: VersionesDeRoles
}

export const TITULO_DE_QUIEN_CREA_Y_QUIEN_VE = 'Quién crea y quién ve'

// El resumen plegable de «Quién crea y quién ve» arriba del bloque «Cotizaciones»: un botón de revelado (sin tarjeta propia: ya está dentro de la tarjeta de la
// matriz) que empieza cerrado, salvo que la URL traiga `?origen=` (una URL vieja o un enlace que ya eligió un origen). Su código se pide al abrir.
export function ResumenDeQuienCrea({
  roles,
  origenes,
  misPermisos,
  puedeGestionar,
  versiones,
}: Props) {
  const [origen] = useQueryState('origen')
  const [abierto, setAbierto] = useState(origen !== null)
  const montar = useAbiertoAlgunaVez(abierto)
  const id = useId()
  const idDelCuadro = `${id}-cuadro`
  return (
    <div className="grid gap-3 px-3 py-1">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idDelCuadro}
        onClick={() => {
          setAbierto((antes) => !antes)
        }}
        className="focus-visible:ring-ring -ml-1 flex h-11 w-fit items-center gap-1.5 rounded-md px-1 text-(length:--text-sm) font-medium text-(--color-ink) hover:bg-(--color-paper-dim) focus-visible:ring-[3px] focus-visible:outline-none md:h-8"
      >
        <ChevronRightIcon
          aria-hidden
          className={cn(
            'size-4 transition-transform motion-reduce:transition-none',
            abierto && 'rotate-90',
          )}
        />
        {TITULO_DE_QUIEN_CREA_Y_QUIEN_VE}
      </button>
      <div id={idDelCuadro} hidden={!abierto} className="pb-2">
        {montar ? (
          <QuienCreaYQuienVeDiferido
            roles={roles}
            origenes={origenes}
            misPermisos={misPermisos}
            puedeGestionar={puedeGestionar}
            versiones={versiones}
          />
        ) : null}
      </div>
    </div>
  )
}
