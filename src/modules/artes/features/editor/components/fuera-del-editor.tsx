import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { EnlaceVolverAArtes } from './barra/enlace-volver-a-artes'
import { BARRA_DEL_EDITOR } from './rejilla'

type Props = {
  // El `h1` (para el lector): la página no tiene otro.
  titulo: string
  children: ReactNode
}

// `/artes/<id>` cuando no se abre el editor (no está, sin permiso, oculta en el Modo Live, un documento que esta versión no lee): la misma
// barra de 3rem que el editor, con «Volver a Artes», y el estado al centro de lo que queda. Puro.
export function FueraDelEditor({ titulo, children }: Props) {
  return (
    <div className="grid min-h-dvh grid-rows-[3rem_minmax(0,1fr)] bg-(--color-paper)">
      <header className={BARRA_DEL_EDITOR}>
        <EnlaceVolverAArtes href={RUTAS.artes} />
        <h1 className="sr-only">{titulo}</h1>
      </header>
      <div className="grid min-w-0 place-items-center p-4">{children}</div>
    </div>
  )
}
