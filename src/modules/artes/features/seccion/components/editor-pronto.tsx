import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// `/artes/<id>` mientras no llega el editor de artes: el nombre de la plantilla como título, que el editor llega pronto y el camino de vuelta.
// No redirige: el enlace de la tarjeta ya es el de siempre.
export function EditorPronto({ nombre }: { nombre: string }) {
  return (
    <div className="grid max-w-prose gap-3">
      <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
        {nombre}
      </h1>
      <p className="text-(--color-ink-soft)">El editor de artes llega pronto.</p>
      <div>
        <Link
          href={RUTAS.artes}
          className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
        >
          Volver a Artes
        </Link>
      </div>
    </div>
  )
}
