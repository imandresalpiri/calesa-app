'use client'

import { useState } from 'react'
import type { EnlaceDeAyudaDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import type { EnlacesDeAyuda } from '../hooks/use-enlaces-de-ayuda'
import { useFormularioDeEnlace } from '../hooks/use-formulario-de-enlace'
import { ModalDeEnlace } from './modal-de-enlace'

type Props = {
  abierto: boolean
  alCerrar: () => void
  enlaces: EnlacesDeAyuda
  // Nulo = «Nuevo enlace».
  original: EnlaceDeAyudaDeLaEmpresa | null
  noDisponible: string | null
}

// «Nuevo enlace» y «Editar» de un enlace de la empresa (`?panel=nuevo-enlace-de-ayuda`, `?panel=editar-enlace-de-ayuda&enlace=`). El id del
// intento nace al abrir y se conserva en cada reintento: guardar dos veces lo mismo no crea otro. Activar, ordenar y quitar se hacen en la lista.
export function ModalDeEnlaceDeLaEmpresa({
  abierto,
  alCerrar,
  enlaces,
  original,
  noDisponible,
}: Props) {
  const [intento] = useState(() => crypto.randomUUID())
  const formulario = useFormularioDeEnlace({
    original,
    version: original?.actualizadoEn ?? null,
    abierto,
    alCerrar,
    enCurso: enlaces.enCurso,
    mandar: (campos, cambios) =>
      original ? enlaces.guardar(original, cambios) : enlaces.crear(intento, campos),
    textos: { creado: 'Enlace creado.', guardado: 'Enlace guardado.' },
  })
  return (
    <ModalDeEnlace
      prefijo="enlace-de-ayuda"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar enlace' : 'Nuevo enlace'}
      descripcion="Lo ve todo el equipo en «Ayuda», desde el menú del perfil."
      formulario={formulario}
      noDisponible={noDisponible}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear enlace', enCurso: 'Creando…' }
      }
    />
  )
}
