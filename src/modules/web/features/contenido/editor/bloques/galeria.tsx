'use client'

import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { RotateCcwIcon, XIcon } from 'lucide-react'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { MAXIMO_DE_IMAGENES_DE_LA_GALERIA } from '../../../../entities/contenido/doc'
import { agregarFotoALaGaleria, fotosDeLaGaleria } from './comandos'
import { descartarSubida, reintentarSubida, usePendientes, type Pendiente } from './subidas.client'

type PropsDeFotoPendiente = {
  pendiente: Pendiente
  grupo: string | null
  alTerminar: (ruta: string) => void
}

// Una foto de la galería que todavía sube (o falló): se reintenta o se descarta ahí mismo.
function FotoPendiente({ pendiente, grupo, alTerminar }: PropsDeFotoPendiente) {
  return (
    <li
      role={pendiente.estado === 'error' ? 'alert' : 'status'}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-(--radius-sm) bg-(--color-paper-dim) p-2 text-center text-(length:--text-sm) text-(--color-ink-soft)"
    >
      {pendiente.estado === 'error' ? (
        <>
          <span className="text-(--color-peligro-ink)">
            {pendiente.mensaje ?? 'No se pudo subir.'}
          </span>
          <span className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Reintentar"
              title="Reintentar"
              onClick={() => {
                if (grupo) reintentarSubida(grupo, pendiente.id, alTerminar)
              }}
            >
              <RotateCcwIcon aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Descartar"
              title="Descartar"
              onClick={() => {
                if (grupo) descartarSubida(grupo, pendiente.id)
              }}
            >
              <XIcon aria-hidden />
            </Button>
          </span>
        </>
      ) : (
        <span>Subiendo…</span>
      )}
    </li>
  )
}

function VistaDeLaGaleria({ node, editor, selected }: NodeViewProps) {
  const fotos = fotosDeLaGaleria(node)
  const grupo = typeof node.attrs['subida'] === 'string' ? node.attrs['subida'] : null
  const pendientes = usePendientes(grupo)
  const alTerminar = (ruta: string) => {
    if (grupo) agregarFotoALaGaleria(editor, grupo, ruta)
  }
  return (
    <NodeViewWrapper
      data-bloque="galeria"
      contentEditable={false}
      className={`my-2 grid gap-2 rounded-(--radius-md) border p-2 ${selected ? 'border-(--color-ring) ring-2 ring-(--color-ring)' : 'border-(--color-line)'}`}
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fotos.map((foto) => (
          <li key={foto.ruta} className="overflow-hidden rounded-(--radius-sm)">
            {/* eslint-disable-next-line @next/next/no-img-element -- la URL pública del bucket `web`; el editor no optimiza. */}
            <img
              src={urlPublica('web', foto.ruta)}
              alt={foto.alt}
              className="aspect-square w-full object-cover"
            />
          </li>
        ))}
        {pendientes.map((pendiente) => (
          <FotoPendiente
            key={pendiente.id}
            pendiente={pendiente}
            grupo={grupo}
            alTerminar={alTerminar}
          />
        ))}
      </ul>
      {fotos.length === 0 && pendientes.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La galería está vacía: agrega imágenes desde las opciones del bloque.
        </p>
      ) : null}
      {fotos.length >= MAXIMO_DE_IMAGENES_DE_LA_GALERIA ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La galería llegó a las {MAXIMO_DE_IMAGENES_DE_LA_GALERIA} imágenes.
        </p>
      ) : null}
    </NodeViewWrapper>
  )
}

// La galería de la guía: de 1 a 12 imágenes del bucket `web` (`{ imagenes: [{ ruta, alt }] }`) más `subida`, el grupo de las que suben ahora
// (transitorio). Vacía no es parte del documento.
export const Galeria = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      imagenes: {
        default: [],
        rendered: false,
        parseHTML: (el) =>
          Array.from(el.querySelectorAll('img[data-ruta]')).map((img) => ({
            ruta: img.getAttribute('data-ruta') ?? '',
            alt: img.getAttribute('alt') ?? '',
          })),
      },
      subida: { default: null, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'figure.guia-galeria' }]
  },

  renderHTML() {
    return ['figure', { class: 'guia-galeria' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VistaDeLaGaleria)
  },
})
