'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/shared/ui/button'
import { fraseDelNivelFijo, type NivelDeAcceso } from '../../../entities/nivel'

export const MENSAJE_DE_NIVELES_SIN_CARGAR = 'No pudimos cargar los niveles de acceso.'

// El primer renglón de los niveles en la matriz: los niveles que nadie cambia («Todos»), con su frase y sin celdas. Con la lista sin leer, el error.
export function CabezaDeNiveles({ fijos }: { fijos: readonly NivelDeAcceso[] }) {
  return (
    <ul className="grid">
      {fijos.map((nivel) => (
        <li
          key={nivel.id}
          data-nivel-fijo={nivel.clave}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2"
        >
          <span className="text-(length:--text-sm) text-(--color-ink)">{nivel.nombre}</span>
          <span className="text-(length:--text-xs) text-(--color-ink-faint)">
            {fraseDelNivelFijo()}
          </span>
        </li>
      ))}
    </ul>
  )
}

// La lista de niveles no se pudo leer: sólo este renglón lo dice (la matriz sigue) y «Reintentar» vuelve a leer la página.
export function ErrorDeNiveles() {
  const router = useRouter()
  const [leyendo, iniciar] = useTransition()
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="text-(length:--text-sm) text-(--color-ink)">
        {MENSAJE_DE_NIVELES_SIN_CARGAR}
      </span>
      <Button
        variant="outline"
        className="h-11 md:h-8"
        disabled={leyendo}
        onClick={() => {
          iniciar(() => {
            router.refresh()
          })
        }}
      >
        Reintentar
      </Button>
    </div>
  )
}
