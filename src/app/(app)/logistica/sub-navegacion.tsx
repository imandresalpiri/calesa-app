'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SettingsIcon } from 'lucide-react'
import { cn } from 'cn'
import { RUTAS } from '@/shared/lib/rutas'
import { esEnlaceActual, esLaConfiguracion, type EnlaceDelMenu } from './enlaces'

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

// «Configurar»: el enlace a la configuración de la logística, a la derecha de la fila de la barra (o solo). Con el nombre «Configurar la logística»; en la página de configuración queda marcado y la barra no
// marca ningún enlace. Es un enlace, no un botón con JS: lo único del cliente es saber en qué página está.
export function BotonDeConfigurar() {
  const actual = esLaConfiguracion(usePathname())
  return (
    <Link
      href={RUTAS.configuracionDeLogistica as Route}
      aria-label="Configurar la logística"
      aria-current={actual ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-pill) px-3 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:min-h-8',
        actual && 'bg-(--color-surface) font-medium text-(--color-ink)',
      )}
    >
      <SettingsIcon aria-hidden className="size-4" />
      Configurar
    </Link>
  )
}
