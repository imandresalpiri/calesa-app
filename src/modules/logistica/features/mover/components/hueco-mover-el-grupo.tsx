'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../../../entities/nucleo/enlaces'
import type { GrupoDeLogistica } from '../../../entities/nucleo/grupo'
import {
  CLAVE_DE_CONTENEDOR_DEL_LOTE,
  PANEL_DEL_LOTE,
} from '../../../entities/mover/claves-del-lote'

// El hueco «Mover el contenedor» de un contenedor (6.04-3, D11): «Marcar que llegó» abre el lote con las unidades del contenedor para moverlas juntas. Sólo un contenedor lo tiene: un
// embarque o una declaración no se mueven por aquí. Lleva a la Cadena del origen de la pestaña (sin él, la del último que usó la persona).
export function HuecoMoverElGrupo({ grupo }: { grupo: GrupoDeLogistica }) {
  if (grupo.tipo !== 'contenedor') return null
  const parametros = new URLSearchParams({
    panel: PANEL_DEL_LOTE,
    [CLAVE_DE_CONTENEDOR_DEL_LOTE]: grupo.id,
  })
  if (grupo.origenId) parametros.set(CLAVE_DE_ORIGEN_DE_LOGISTICA, grupo.origenId)
  const href = `${RUTAS.logistica}?${parametros.toString()}`
  return (
    <div className="grid gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Abre el lote con las unidades del contenedor para moverlas juntas.
      </p>
      <Link
        href={href as Route}
        prefetch={false}
        className={buttonVariants({
          variant: 'outline',
          className: 'min-h-11 justify-self-start md:min-h-9',
        })}
      >
        Marcar que llegó
      </Link>
    </div>
  )
}
