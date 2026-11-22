import { cn } from 'cn'
import { useId, type ReactNode } from 'react'

// Con `toque`, el cuerpo va encima del botón que cubre la tarjeta pero deja pasar el clic (`pointer-events-none`): tocar el texto abre la principal, y lo que
// sí es de la tarjeta —un enlace, un interruptor, un botón de adentro— lo recupera (`pointer-events-auto`).
const CUERPO_CON_TOQUE =
  'relative pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_label]:pointer-events-auto [&_[role=switch]]:pointer-events-auto'

type Props = {
  titulo: string
  // El estado de lo que la tarjeta configura (un `<Badge>`): junto al título.
  estado?: ReactNode
  // El «⋯» con la lista completa de acciones de la entidad (`<MasAcciones>`).
  acciones?: ReactNode
  // Tocar la tarjeta (fuera del «⋯») abre su acción principal: un `<ToqueDeLaTarjeta>`, el botón con nombre que cubre la tarjeta y deja el «⋯» encima.
  toque?: ReactNode
  children: ReactNode
}

// Un bloque de una página de ajustes: su título, lo guardado a la vista y, arriba a la derecha, su «⋯» (nunca un botón suelto). Es una región con
// nombre (el título). Sin `'use client'`: las acciones llegan como nodos, así que la tarjeta es sólo texto y viaja en frío.
// El título lleva `basis-32` (en rem): con el texto al 200 % no cabe junto a los botones y la cabecera se parte en dos líneas, en vez de aplastarlo.
// `break-inside-avoid` y `mb-4` (no `gap`): las columnas CSS parten lo que se deja partir, y una tarjeta no se parte.
// Con `toque`, el botón que cubre la tarjeta va primero en el DOM y las acciones (`relative`) quedan encima: el «⋯» recibe sus clics y la tarjeta, los demás.
export function TarjetaDeAjustes({ titulo, estado, acciones, toque, children }: Props) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      data-slot="tarjeta-de-ajustes"
      className="relative mb-4 min-w-0 break-inside-avoid rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2)"
    >
      {toque}
      <header className="mb-3 flex flex-wrap items-start gap-2">
        <div className="flex min-w-0 grow basis-32 flex-wrap items-center gap-x-2 gap-y-1">
          <h2
            id={id}
            className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)"
          >
            {titulo}
          </h2>
          {estado}
        </div>
        {acciones ? (
          <div className="relative ms-auto flex items-center gap-1">{acciones}</div>
        ) : null}
      </header>
      <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-3', toque && CUERPO_CON_TOQUE)}>
        {children}
      </div>
    </section>
  )
}
