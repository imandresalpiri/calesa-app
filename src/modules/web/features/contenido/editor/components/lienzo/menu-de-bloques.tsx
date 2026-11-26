'use client'

import {
  Columns3Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  MousePointerClickIcon,
  PilcrowIcon,
  QuoteIcon,
  VideoIcon,
  type LucideIcon,
} from 'lucide-react'
import type {
  BloqueDeLaGuia,
  ClaveDeBloque,
} from '../../../../../entities/contenido/bloques-de-la-guia'

const ICONOS: Record<ClaveDeBloque, LucideIcon> = {
  parrafo: PilcrowIcon,
  'titulo-grande': Heading2Icon,
  'titulo-chico': Heading3Icon,
  lista: ListIcon,
  'lista-numerada': ListOrderedIcon,
  cita: QuoteIcon,
  imagen: ImageIcon,
  galeria: Columns3Icon,
  boton: MousePointerClickIcon,
  video: VideoIcon,
  separador: MinusIcon,
}

type Props = {
  id: string
  bloques: readonly BloqueDeLaGuia[]
  elegido: number
  alElegir: (bloque: BloqueDeLaGuia) => void
  alPasar: (n: number) => void
}

// La lista de bloques que abre «/»: el foco se queda en el texto; las flechas mueven la elegida y Enter la inserta.
export function MenuDeBloques({ id, bloques, elegido, alElegir, alPasar }: Props) {
  return (
    <div className="max-h-80 w-72 max-w-full overflow-y-auto rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-1 shadow-lg">
      <p role="status" className="sr-only">
        {bloques.length === 0 ? 'Ningún bloque se llama así.' : `${bloques.length} bloques`}
      </p>
      {bloques.length === 0 ? (
        <p className="px-2 py-3 text-(length:--text-sm) text-(--color-ink-soft)">
          Ningún bloque se llama así.
        </p>
      ) : (
        <div role="listbox" id={id} aria-label="Bloques" aria-activedescendant={`${id}-${elegido}`}>
          {bloques.map((bloque, n) => {
            const Icono = ICONOS[bloque.clave]
            return (
              <div
                key={bloque.clave}
                id={`${id}-${n}`}
                role="option"
                aria-selected={n === elegido}
                tabIndex={-1}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-sm) px-2 text-(length:--text-sm) ${n === elegido ? 'bg-(--color-paper-dim)' : ''}`}
                // Que el editor no pierda el cursor al tocar una opción.
                onMouseDown={(evento) => {
                  evento.preventDefault()
                }}
                onMouseEnter={() => {
                  alPasar(n)
                }}
                onClick={() => {
                  alElegir(bloque)
                }}
              >
                <Icono aria-hidden className="size-4 shrink-0" />
                <span className="grid min-w-0">
                  <span className="font-medium text-(--color-ink)">{bloque.etiqueta}</span>
                  <span className="text-(--color-ink-soft)">{bloque.descripcion}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
