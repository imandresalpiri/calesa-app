'use client'

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { PlayIcon } from 'lucide-react'
import { motivoDelBloque } from '../../../../entities/contenido/doc'
import { enlaceDeVideo } from '../../../../entities/contenido/video'
import { MotivoDelBloque } from '../components/lienzo/motivo-del-bloque'

function VistaDelVideo({ node, selected }: NodeViewProps) {
  const url = typeof node.attrs['url'] === 'string' ? node.attrs['url'] : ''
  const motivo = motivoDelBloque(node.toJSON())
  const enlace = enlaceDeVideo(url)
  return (
    <NodeViewWrapper
      data-bloque="video"
      contentEditable={false}
      className={`my-2 grid gap-1 rounded-(--radius-md) border p-3 ${selected ? 'border-(--color-ring) ring-2 ring-(--color-ring)' : 'border-(--color-line)'}`}
    >
      <div className="flex min-h-16 items-center gap-3 rounded-(--radius-md) bg-(--color-paper-dim) px-3 text-(length:--text-sm) text-(--color-ink)">
        <PlayIcon aria-hidden className="size-5 shrink-0" />
        <span className="min-w-0 break-all">
          {url === '' ? 'Pega un enlace de YouTube o Vimeo en las opciones del bloque.' : url}
        </span>
        {enlace ? (
          <span className="ms-auto shrink-0 text-(--color-ink-soft)">
            {enlace.proveedor === 'youtube' ? 'YouTube' : 'Vimeo'}
          </span>
        ) : null}
      </div>
      <MotivoDelBloque motivo={url === '' ? 'Pega un enlace de YouTube o Vimeo.' : motivo} />
    </NodeViewWrapper>
  )
}

// El video de la guía: sólo el enlace canónico de YouTube o Vimeo (`{ url }`); el sitio decide cómo lo dibuja, el editor no incrusta nada.
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        rendered: false,
        parseHTML: (el) => el.querySelector('a')?.getAttribute('href') ?? '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure.guia-video' }]
  },

  renderHTML() {
    return ['figure', { class: 'guia-video' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VistaDelVideo)
  },
})
