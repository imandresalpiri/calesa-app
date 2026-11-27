'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { avisar } from '@/shared/ui/toasts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { FUNCIONES_DE_LA_AYUDA } from '../../../../../entities/formula/ayuda-de-funciones'
import type { InsercionEnLaBarra } from '../../../hooks/use-insercion-en-la-barra'

const BOTON =
  'flex min-h-[44px] shrink-0 items-center gap-0.5 rounded-(--radius-md) px-2 font-serif text-(--color-ink) italic outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:pointer-fine:min-h-9'
const APAGADO = 'cursor-not-allowed text-(--color-ink-faint) hover:bg-transparent'

// `fx ▾` de la barra de fórmula: las diez funciones con su firma y un ejemplo; elegir una la inserta con su forma corta en el cursor de la barra (`SUMA()`, el
// cursor adentro), abriendo la edición si no estaba abierta. Actúa cuando el menú terminó de cerrarse (si no, el foco vuelve al botón y el cursor se pierde).
// Apagado, dice por qué (en el `title` y, al tocarlo, en un aviso: en el celular no hay `title`).
export function BotonDeFunciones({ funcion }: { funcion: InsercionEnLaBarra }) {
  const [elegida, setElegida] = useState<string | null>(null)
  if (funcion.motivo !== null) {
    const { motivo } = funcion
    return (
      <button
        type="button"
        aria-disabled
        aria-label="Insertar una función"
        title={motivo}
        className={`${BOTON} ${APAGADO}`}
        onClick={() => {
          avisar(motivo)
        }}
      >
        fx
        <ChevronDownIcon aria-hidden className="size-3.5 not-italic" />
      </button>
    )
  }
  return (
    <DropdownMenu
      onOpenChange={(abierto) => {
        if (abierto) setElegida(null)
      }}
      onOpenChangeComplete={(abierto) => {
        if (abierto || elegida === null) return
        setElegida(null)
        funcion.insertar(elegida)
      }}
    >
      <DropdownMenuTrigger aria-label="Insertar una función" className={BOTON}>
        fx
        <ChevronDownIcon aria-hidden className="size-3.5 not-italic" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-w-(--available-width)">
        {FUNCIONES_DE_LA_AYUDA.map((f) => (
          <DropdownMenuItem
            key={f.nombre}
            className="grid min-h-[44px] gap-0.5 py-1.5 md:pointer-fine:min-h-9"
            onClick={() => {
              setElegida(f.nombre)
            }}
          >
            <span className="font-mono text-(length:--text-sm) font-semibold">{f.firma}</span>
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              {f.frase} <span className="font-mono">{f.ejemplo}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
