import { useId, type ReactNode } from 'react'

type Props = { titulo: string; children: ReactNode }

// Un grupo de campos de un formulario de panel: una `<section>` plana con su `h3` y una línea arriba que la separa de la anterior. Nunca lleva caja ni se pliega, y no se anida (un solo nivel de
// secciones por panel, `.claude/rules/ui.md`); el que arranca el panel va sin título, con lo principal.
export function GrupoDeCampos({ titulo, children }: Props) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t border-(--color-line) pt-4"
    >
      <h3 id={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        {titulo}
      </h3>
      {children}
    </section>
  )
}
