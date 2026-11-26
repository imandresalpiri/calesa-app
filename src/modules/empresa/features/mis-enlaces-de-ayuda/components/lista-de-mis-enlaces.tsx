'use client'

import { claveDelElemento } from '../../../entities/mis-enlaces-de-ayuda'
import type { MisEnlacesDeAyuda } from '../hooks/use-mis-enlaces-de-ayuda'
import { FilaDeMiEnlace } from './fila-de-mi-enlace'

type Props = {
  misEnlaces: MisEnlacesDeAyuda
  // El prefijo de los ids del «⋯» de cada fila: adonde vuelve el foco tras mover.
  prefijo: string
  alEditar: (id: string) => void
}

// La lista del modal de Perfil, en el orden de quien mira, o su vacío. El anuncio de dónde quedó lo movido, para el lector de pantalla.
export function ListaDeMisEnlaces({ misEnlaces, prefijo, alEditar }: Props) {
  const { elementos } = misEnlaces
  return (
    <>
      {elementos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no hay enlaces de ayuda.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Mis enlaces de ayuda">
          {elementos.map((elemento) => (
            <FilaDeMiEnlace
              key={claveDelElemento(elemento)}
              elementos={elementos}
              elemento={elemento}
              prefijo={prefijo}
              enCurso={misEnlaces.enCurso}
              alMostrar={(id, mostrar) => void misEnlaces.mostrar(id, mostrar)}
              alEditar={alEditar}
              alQuitar={(id) => void misEnlaces.quitarPropio(id)}
              alMover={(clave, direccion) => void misEnlaces.mover(clave, direccion)}
            />
          ))}
        </ul>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {misEnlaces.anuncio}
      </p>
    </>
  )
}
