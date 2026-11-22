import type { Route } from 'next'
import Link from 'next/link'
import type { BloqueBandeja } from '../../../entities/bandeja'

type Props = {
  bloque: Pick<BloqueBandeja, 'verTodos'>
  // A dónde lleva: la lista completa, ya filtrada.
  ruta: string
  // El bloque llegó a su tope (pidió `TOPE_DE_BLOQUE + 1` y volvió una de más): debajo del tope se ve todo y no se dibuja.
  hayMas: boolean
  // Quien mira puede abrir el destino (el permiso de la pantalla a la que lleva, no el del bloque). Sin él no hay enlace: el bloque sigue con su conteo.
  puedeAbrir?: boolean
}

// «Ver todos» / «Ver todas» (según lo que lista el bloque: `bloque.verTodos`): un enlace bajo la lista, con el área táctil del resto de la bandeja. Se dibuja sólo cuando el
// bloque llega a su tope y quien mira puede abrir el destino; en cualquier otro caso, nada.
export function VerTodasDelBloque({ bloque, ruta, hayMas, puedeAbrir = true }: Props) {
  if (!hayMas || !puedeAbrir) {
    return null
  }
  return (
    <Link
      href={ruta as Route}
      className="flex min-h-11 items-center border-t border-(--color-line) px-4 text-(length:--text-sm) text-(--color-primario) underline underline-offset-2 hover:bg-(--color-surface-muted) focus-visible:bg-(--color-surface-muted) md:min-h-9"
    >
      {bloque.verTodos}
    </Link>
  )
}
