'use client'

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { motivoDelBloque } from '../../../../entities/contenido/doc'
import { MotivoDelBloque } from '../components/lienzo/motivo-del-bloque'

function VistaDelBoton({ node, selected }: NodeViewProps) {
  const texto = typeof node.attrs['texto'] === 'string' ? node.attrs['texto'] : ''
  const motivo = motivoDelBloque(node.toJSON())
  return (
    <NodeViewWrapper
      data-bloque="boton"
      contentEditable={false}
      className={`my-2 grid gap-1 rounded-(--radius-md) border p-3 ${selected ? 'border-(--color-ring) ring-2 ring-(--color-ring)' : 'border-transparent'}`}
    >
      <span className="inline-flex min-h-11 w-fit max-w-full items-center rounded-(--radius-md) bg-(--color-ink) px-4 text-(length:--text-sm) font-medium break-words text-(--color-paper)">
        {texto.trim() === '' ? 'Botón sin texto' : texto}
      </span>
      <MotivoDelBloque motivo={motivo} />
    </NodeViewWrapper>
  )
}

// El botón de la guía: `{ texto, href }`. Se escribe en las opciones del bloque; lo que no vale se queda a la vista con su motivo.
export const Boton = Node.create({
  name: 'button',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      texto: {
        default: '',
        rendered: false,
        parseHTML: (el) => el.textContent.trim(),
      },
      href: { default: '', rendered: false, parseHTML: (el) => el.getAttribute('href') ?? '' },
    }
  },

  parseHTML() {
    return [{ tag: 'a.guia-boton' }]
  },

  renderHTML() {
    return ['a', { class: 'guia-boton' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VistaDelBoton)
  },
})
