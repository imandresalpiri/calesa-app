'use client'

import { useState } from 'react'
import type { EnlacePropio } from '../../../entities/mis-enlaces-de-ayuda'
import { ModalDeEnlace } from '../../enlaces-de-ayuda/components/modal-de-enlace'
import { useFormularioDeEnlace } from '../../enlaces-de-ayuda/hooks/use-formulario-de-enlace'
import type { MisEnlacesDeAyuda } from '../hooks/use-mis-enlaces-de-ayuda'

type Props = {
  abierto: boolean
  alCerrar: () => void
  misEnlaces: MisEnlacesDeAyuda
  // Nulo = «Agregar enlace propio».
  original: EnlacePropio | null
  noDisponible: string | null
}

// «Agregar enlace propio» y «Editar» de uno propio (`?panel=nuevo-enlace-propio`, `?panel=editar-enlace-propio&enlace=<id>`): sólo lo ve
// quien lo crea. Guarda la lista entera con la versión de lo leído; el id del intento nace al abrir y se conserva en cada reintento.
export function ModalDeEnlacePropio({
  abierto,
  alCerrar,
  misEnlaces,
  original,
  noDisponible,
}: Props) {
  const [intento] = useState(() => crypto.randomUUID())
  const formulario = useFormularioDeEnlace({
    original,
    version: misEnlaces.version,
    abierto,
    alCerrar,
    enCurso: misEnlaces.enCurso,
    mandar: (campos) => misEnlaces.guardarPropio({ id: original?.id ?? intento, ...campos }),
    textos: { creado: 'Enlace agregado.', guardado: 'Enlace guardado.' },
  })
  return (
    <ModalDeEnlace
      prefijo="enlace-propio"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar enlace propio' : 'Agregar enlace propio'}
      descripcion="Sólo lo ves tú, en «Ayuda», desde el menú del perfil."
      formulario={formulario}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Agregar enlace', enCurso: 'Agregando…' }
      }
    />
  )
}
