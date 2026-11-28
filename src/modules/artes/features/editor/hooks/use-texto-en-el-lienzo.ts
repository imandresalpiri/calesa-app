'use client'

import { useCallback, useState } from 'react'
import type { CapaDe } from '../../../entities/documento'
import type { EditorDeArte } from '../tipos'

// El texto que se escribe sobre el lienzo (doble clic o Enter con un texto elegido). Al terminar, lo escrito es un solo `cambiar`. Si la
// capa deja de estar (se deshizo), deja de editarse.
export function useTextoEnElLienzo(editor: EditorDeArte) {
  const [editando, setEditando] = useState<string | null>(null)
  const { pagina, despachar, soloLectura } = editor
  const capa =
    editando === null
      ? null
      : (pagina.capas.find((c): c is CapaDe<'texto'> => c.id === editando && c.tipo === 'texto') ??
        null)

  const empezar = useCallback(
    (id: string) => {
      if (!soloLectura) {
        setEditando(id)
      }
    },
    [soloLectura],
  )

  const terminar = useCallback(
    (texto: string) => {
      setEditando(null)
      if (capa && texto !== capa.texto) {
        despachar({
          tipo: 'cambiar',
          ids: [capa.id],
          cambio: (c) => (c.tipo === 'texto' ? { ...c, texto } : c),
        })
      }
    },
    [capa, despachar],
  )

  return { capa, empezar, terminar }
}
