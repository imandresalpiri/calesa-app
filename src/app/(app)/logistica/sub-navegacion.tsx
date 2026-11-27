'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { cn } from 'cn'
import { CLAVE_DE_ORIGEN_DE_LA_CADENA } from '@/modules/logistica/client'
import { rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import { destinoDeConfigurar, esEnlaceActual, type EnlaceDelMenu } from './enlaces'

// La sub-navegación de `/logistica`: Cadena y las áreas que ya tienen página. Marca la actual con `aria-current`.
export function SubNavegacion({ enlaces }: { enlaces: readonly EnlaceDelMenu[] }) {
  const ruta = usePathname()
  return (
    <nav aria-label="Logística" className="flex flex-wrap gap-1">
      {enlaces.map((enlace) => {
        const actual = esEnlaceActual(enlace, ruta)
        return (
          <Link
            key={enlace.ruta}
            href={enlace.ruta as Route}
            aria-current={actual ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-(--radius-pill) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:min-h-8',
              actual && 'bg-(--color-surface) font-medium text-(--color-ink)',
            )}
          >
            {enlace.titulo}
          </Link>
        )
      })}
    </nav>
  )
}

// «Configurar»: el enlace a la pestaña Fases del origen que muestra la cadena (`?origen=`), donde se configuran su flujo y sus catálogos; si la persona no
// configura ése, al primero que configura. A la derecha de la fila de la barra (o solo), con el nombre «Configurar la logística». Es un enlace: lo único del
// cliente es leer `?origen=`.
export function BotonDeConfigurar({ permitidos }: { permitidos: readonly string[] }) {
  const [pedido] = useQueryState(CLAVE_DE_ORIGEN_DE_LA_CADENA, parseAsString)
  const destino = destinoDeConfigurar(pedido, permitidos)
  if (destino === null) {
    return null
  }
  return (
    <Link
      href={rutaDeParteDelOrigen(destino, 'fases')}
      aria-label="Configurar la logística"
      className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-pill) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:min-h-8"
    >
      <SettingsIcon aria-hidden className="size-4" />
      Configurar
    </Link>
  )
}
