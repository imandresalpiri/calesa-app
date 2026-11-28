'use client'

import { useImperativeHandle, type Ref } from 'react'
import type { CapaDeArte, PaginaDeArte } from '../../../entities/documento'
import { estaBloqueada, estaOculta } from '../../../entities/editor/grupos'
import type { EditorDeArte, ManejoDelLienzo } from '../tipos'
import type { PlumaDelLienzo } from './use-pluma'

type Args = {
  ref: Ref<ManejoDelLienzo> | undefined
  editor: EditorDeArte
  pluma: PlumaDelLienzo
  // Si ya se escribe un texto encima, y cómo empezar a escribir uno.
  escribiendo: boolean
  empezarTexto: (id: string) => void
  terminarElTexto: ManejoDelLienzo['terminarElTexto']
  imagen: ManejoDelLienzo['imagen']
}

// El texto que Enter abre: el único elegido, visible y sin candado.
function textoParaEscribir(pagina: PaginaDeArte, seleccion: readonly string[]): CapaDeArte | null {
  const [id] = seleccion
  const capa = seleccion.length === 1 ? pagina.capas.find((c) => c.id === id) : undefined
  if (capa?.tipo !== 'texto' || estaOculta(pagina, capa) || estaBloqueada(pagina, capa)) {
    return null
  }
  return capa
}

// Lo que el editor le pide al lienzo (`ManejoDelLienzo`): Enter termina el trazo de la pluma o abre el texto elegido; Supr quita el nodo
// elegido de un trazo (o el último del que se dibuja); `terminarElTexto()` deja lo escrito en el documento antes de guardar; `imagen()` exporta.
export function useManejoDelLienzo({
  ref,
  editor,
  pluma,
  escribiendo,
  empezarTexto,
  terminarElTexto,
  imagen,
}: Args) {
  const { terminar, quitar } = pluma
  const { estado, pagina, soloLectura } = editor

  useImperativeHandle(
    ref,
    () => ({
      enter: () => {
        if (terminar()) {
          return true
        }
        const capa = soloLectura || escribiendo ? null : textoParaEscribir(pagina, estado.seleccion)
        if (capa) {
          empezarTexto(capa.id)
        }
        return capa !== null
      },
      quitar,
      terminarElTexto,
      imagen,
    }),
    [
      terminar,
      quitar,
      terminarElTexto,
      imagen,
      estado.seleccion,
      pagina,
      soloLectura,
      escribiendo,
      empezarTexto,
    ],
  )
}
