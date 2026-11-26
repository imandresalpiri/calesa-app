'use client'

import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { RotateCcwIcon, XIcon } from 'lucide-react'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { ImagenDelSitio } from '../imagen'
import { descartarGrupo, reintentarSubida, usePendientes } from './subidas.client'
import { ponerRutaDeLaSubida, quitarPorSubida } from './comandos'

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function VistaDeLaImagen({ node, editor, selected }: NodeViewProps) {
  const ruta = texto(node.attrs['ruta'])
  const subida = typeof node.attrs['subida'] === 'string' ? node.attrs['subida'] : null
  const pendientes = usePendientes(subida)
  const marco = `my-2 grid overflow-hidden rounded-(--radius-md) border ${selected ? 'border-(--color-ring) ring-2 ring-(--color-ring)' : 'border-transparent'}`
  if (ruta !== '') {
    return (
      <NodeViewWrapper className={marco} data-bloque="imagen" contentEditable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element -- la URL pública del bucket `web`; el editor no optimiza. */}
        <img
          src={urlPublica('web', ruta)}
          alt={texto(node.attrs['alt'])}
          className="max-h-96 max-w-full justify-self-center object-contain"
        />
      </NodeViewWrapper>
    )
  }
  const pendiente = pendientes[0]
  const alTerminar = (nueva: string) => {
    if (subida) ponerRutaDeLaSubida(editor, subida, nueva)
  }
  return (
    <NodeViewWrapper className={marco} data-bloque="imagen" contentEditable={false}>
      <div
        role={pendiente?.estado === 'error' ? 'alert' : 'status'}
        className="flex min-h-32 items-center justify-center gap-2 bg-(--color-paper-dim) p-4 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        {pendiente?.estado === 'error' ? (
          <>
            <span className="text-(--color-peligro-ink)">
              {pendiente.mensaje ?? 'No se pudo subir la imagen.'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (subida) reintentarSubida(subida, pendiente.id, alTerminar)
              }}
            >
              <RotateCcwIcon aria-hidden /> Reintentar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (subida) {
                  descartarGrupo(subida)
                  quitarPorSubida(editor, subida)
                }
              }}
            >
              <XIcon aria-hidden /> Quitar
            </Button>
          </>
        ) : (
          <span>Subiendo la imagen…</span>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// La imagen de la guía: la del sitio (`{ ruta, alt }`) más `subida`, el grupo de su subida en curso (transitorio: no se guarda). Sin ruta no es
// parte del documento.
export const ImagenDeLaGuia = ImagenDelSitio.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      subida: { default: null, rendered: false },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(VistaDeLaImagen)
  },
})
