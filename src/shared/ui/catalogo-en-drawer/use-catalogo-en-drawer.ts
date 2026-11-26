'use client'

import { useState } from 'react'
import {
  despuesDeAlMover,
  type DireccionDeOrden,
  type ElementoDeCatalogo,
} from '@/shared/lib/catalogo'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { OperacionesDelCatalogo, TextosDelCatalogo } from './tipos'
import { useNombreDelCatalogo } from './use-nombre-del-catalogo'

// El panel de un catálogo: el nombre (agregar y renombrar), activar y ordenar. La lista llega por props y la revalida la action: aquí
// no se guarda una copia. Un conflicto (`PT409`, otra persona lo cambió) se dice arriba de la lista con «Recargar».
export function useCatalogoEnDrawer(
  lista: readonly ElementoDeCatalogo[],
  operaciones: OperacionesDelCatalogo,
  textos: TextosDelCatalogo,
) {
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)
  const nombre = useNombreDelCatalogo(operaciones, textos, setConflicto)

  async function cambiarActivo(elemento: ElementoDeCatalogo, activo: boolean): Promise<void> {
    const envio = await operaciones.activar(elemento, activo)
    if (envio.ok) {
      avisarExito(activo ? textos.hechos.activado : textos.hechos.desactivado)
    } else if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else {
      avisarError(envio.error)
    }
  }

  async function mover(elemento: ElementoDeCatalogo, direccion: DireccionDeOrden): Promise<void> {
    const despuesDe = despuesDeAlMover(lista, elemento.id, direccion)
    if (despuesDe === undefined) {
      return
    }
    const envio = await operaciones.mover(elemento, despuesDe)
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto') {
        setConflicto(envio.error.mensaje)
      } else {
        avisarError(envio.error)
      }
      return
    }
    const posicion = lista.findIndex((fila) => fila.id === elemento.id) + 1
    const nueva = direccion === 'subir' ? posicion - 1 : posicion + 1
    setAnuncio(
      `«${elemento.nombre}» ${direccion === 'subir' ? 'subió' : 'bajó'} a la posición ${String(nueva)}`,
    )
    setMovimiento((anterior) => ({
      id: elemento.id,
      direccion,
      veces: (anterior?.veces ?? 0) + 1,
    }))
  }

  return {
    nombre,
    cambiarActivo,
    mover,
    conflicto,
    olvidarConflicto: () => {
      setConflicto(null)
    },
    anuncio,
    movimiento,
  }
}
