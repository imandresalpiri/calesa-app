'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { nombreDeLaPagina } from '../../../../entities/editor/paginas'
import type { Medidas } from '../../../../entities/formatos'
import type { PaginasDelEditor } from '../../hooks/use-paginas'
import { MenuDeLaPagina } from './menu-de-la-pagina'

type Props = {
  id: string
  indice: number
  elegida: boolean
  // En sólo lectura no se arrastra.
  quieta: boolean
  caja: Medidas
  paginas: PaginasDelEditor
  // La miniatura (`MiniaturaDeLaPagina`, en `memo`).
  children: ReactNode
}

// Una página de la tira, ordenable con dnd-kit: con el puntero se arrastra la miniatura (pasados 4 px; antes es un clic, que la elige) y con el
// teclado se toma con Espacio, se mueve con ← y →, y se suelta con Espacio (Enter la elige, Esc cancela). La elegida, con borde primario y
// `aria-current="page"`; su número debajo y su «⋯» en la esquina. Caja fija por formato: elegir, agregar o quitar no cambia su tamaño.
export function MiniaturaOrdenable({
  id,
  indice,
  elegida,
  quieta,
  caja,
  paginas,
  children,
}: Props) {
  const nombre = nombreDeLaPagina(indice)
  const ordenable = useSortable({
    id,
    disabled: quieta,
    attributes: { roleDescription: 'página que se ordena' },
  })
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = ordenable
  return (
    <li
      ref={setNodeRef}
      data-pagina={id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 10 } : {}),
      }}
      className="flex shrink-0 flex-col items-center gap-1"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-(--radius-sm) bg-white ring-1 ring-(--color-line)',
          elegida && 'ring-2 ring-(--color-primario)',
          isDragging && 'shadow-(--shadow-md)',
        )}
        style={{ width: caja.ancho, height: caja.alto }}
      >
        {children}
        <button
          type="button"
          {...(quieta ? {} : { ...attributes, ...listeners })}
          aria-label={nombre}
          aria-current={elegida ? 'page' : undefined}
          onClick={() => {
            paginas.ir(id)
          }}
          className="absolute inset-0 cursor-pointer touch-none rounded-(--radius-sm) outline-none focus-visible:shadow-(--shadow-focus)"
        />
        <MenuDeLaPagina
          nombre={nombre}
          motivos={paginas.motivosDe(indice)}
          hacer={{
            duplicar: () => {
              paginas.duplicar(id)
            },
            'mover-antes': () => {
              paginas.mover(id, 'antes')
            },
            'mover-despues': () => {
              paginas.mover(id, 'despues')
            },
            quitar: () => {
              paginas.quitar(id)
            },
          }}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          'text-(length:--text-xs) leading-4 text-(--color-ink-soft) tabular-nums',
          elegida && 'font-semibold text-(--color-ink)',
        )}
      >
        {indice + 1}
      </span>
    </li>
  )
}
