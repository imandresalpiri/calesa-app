'use client'

import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import type { EnlacesDeAyuda } from '../hooks/use-enlaces-de-ayuda'
import { filasDeEnlaces } from './filas-de-enlaces'

const ESTADOS = { activo: 'En el menú', inactivo: 'No se ve en el menú' }

type Props = {
  enlaces: EnlacesDeAyuda
  // El prefijo de los ids del «⋯» de cada fila: adonde vuelve el foco tras mover.
  prefijo: string
  alEditar: (id: string) => void
  alPedirQuitar: (id: string) => void
}

// La lista de la empresa en el modal de Configuración, en su orden, o su vacío. El anuncio de dónde quedó lo movido, para el lector de pantalla.
export function CatalogoDeEnlaces({ enlaces, prefijo, alEditar, alPedirQuitar }: Props) {
  const { lista } = enlaces
  return (
    <>
      {lista.enlaces.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no hay enlaces de ayuda. Suma el primero con «Nuevo enlace».
        </p>
      ) : (
        <ListaDeCatalogo
          filas={filasDeEnlaces(lista.enlaces, {
            alEditar,
            alActivar: (enlace, activo) => void enlaces.activar(enlace, activo),
            alPedirQuitar,
          })}
          prefijo={prefijo}
          columnaDeUso="Dirección"
          estados={ESTADOS}
          alAbrir={alEditar}
          alMover={(id, direccion) => {
            const enlace = lista.enlaces.find((uno) => uno.id === id)
            if (enlace) void enlaces.mover(enlace, direccion)
          }}
        />
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {enlaces.anuncio}
      </p>
    </>
  )
}
