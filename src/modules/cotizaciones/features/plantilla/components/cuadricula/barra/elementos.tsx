'use client'

import { ChevronDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'

const CLASE_DEL_BOTON = 'min-h-11 md:min-h-8 aria-disabled:opacity-50'

// Un botón de la barra: apagado no deja de recibir el foco (`aria-disabled`) y al tocarlo dice por qué (el reductor lo rechaza con su motivo). Su `title` dice qué hace,
// con su atajo, y por qué no se puede.
export function BotonDeLaBarra(props: {
  motivo: string | null
  titulo: string
  ocupado: boolean
  alTocar: () => void
  children: ReactNode
  // Sin texto a la vista (un icono): su nombre accesible.
  etiqueta?: string
  // Un interruptor (negrita, cursiva): encendido o no.
  encendido?: boolean
  // Abre un panel o un cajón.
  abre?: { abierto: boolean }
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={CLASE_DEL_BOTON}
      aria-disabled={props.motivo !== null || props.ocupado}
      aria-label={props.etiqueta}
      aria-pressed={props.encendido}
      aria-haspopup={props.abre === undefined ? undefined : 'dialog'}
      aria-expanded={props.abre?.abierto}
      title={props.motivo === null ? props.titulo : `${props.titulo}: ${props.motivo}`}
      onClick={() => {
        if (!props.ocupado) props.alTocar()
      }}
    >
      {props.children}
    </Button>
  )
}

// Un botón de la barra con su menú (`Insertar ▾`): el texto o el icono, el nombre accesible y lo que se ofrece.
export function MenuDeLaBarra(props: {
  titulo: string
  // Con icono en vez de texto, el nombre accesible es `titulo`.
  icono?: ReactNode
  ocupado: boolean
  motivo?: string | null
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={props.ocupado}
        aria-label={props.icono === undefined ? undefined : props.titulo}
        title={
          props.motivo === undefined || props.motivo === null
            ? props.titulo
            : `${props.titulo}: ${props.motivo}`
        }
        className="inline-flex min-h-11 items-center gap-1 rounded-(--radius-md) border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-sm) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:min-h-8"
      >
        {props.icono ?? props.titulo}
        <ChevronDownIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-(--available-width) min-w-56">
        {props.children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Un grupo de la barra: sus controles juntos, con su nombre accesible, y una línea que lo separa del anterior.
export function GrupoDeLaBarra({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={nombre}
      className="flex min-w-0 flex-wrap items-center gap-1 border-l border-(--color-line) pl-1.5 first:border-l-0 first:pl-0"
    >
      {children}
    </div>
  )
}
