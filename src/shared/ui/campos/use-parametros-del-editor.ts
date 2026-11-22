'use client'

import { parseAsString, useQueryState, useQueryStates } from 'nuqs'
import { useRef } from 'react'

const CAMPO_NUEVO = 'nuevo'

// Lo que el editor guarda en la URL: el campo abierto (`?campo=<id>` o `nuevo`, con `&eliminar=1`) y la búsqueda (`?q=`, sin ir al
// servidor: filtra lo que ya está).
export function useParametrosDelEditor() {
  const [{ campo, eliminar }, setParametros] = useQueryStates(
    { campo: parseAsString, eliminar: parseAsString },
    { shallow: false },
  )
  const [consulta, setConsulta] = useQueryState(
    'q',
    parseAsString.withDefault('').withOptions({ shallow: true, history: 'replace' }),
  )
  const busqueda = useRef<HTMLInputElement>(null)
  const abrir = (id: string, conEliminar = false) =>
    void setParametros({ campo: id, eliminar: conEliminar ? '1' : null })
  const buscar = (texto: string) => void setConsulta(texto === '' ? null : texto)
  return {
    // El abierto entre los campos: 'nuevo', el campo, o null (cerrado, o un id que ya no está).
    abiertoEntre: <Campo extends { id: string }>(
      campos: readonly Campo[],
    ): Campo | 'nuevo' | null =>
      campo === CAMPO_NUEVO ? CAMPO_NUEVO : (campos.find((otro) => otro.id === campo) ?? null),
    eliminar: eliminar === '1',
    abrir,
    crear: () => {
      abrir(CAMPO_NUEVO)
    },
    cerrar: () => void setParametros({ campo: null, eliminar: null }),
    consulta,
    buscar,
    busqueda,
    // Borra la búsqueda y deja el foco en ella.
    limpiar: () => {
      buscar('')
      busqueda.current?.focus()
    },
  }
}
