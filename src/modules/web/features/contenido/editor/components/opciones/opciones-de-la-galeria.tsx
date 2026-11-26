'use client'

import type { Editor } from '@tiptap/react'
import { Trash2Icon } from 'lucide-react'
import { useRef } from 'react'
import { urlPublica } from '@/shared/lib/almacen'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  MAXIMO_DEL_ALT,
  MAXIMO_DE_IMAGENES_DE_LA_GALERIA,
} from '../../../../../entities/contenido/doc'
import { cambiarAtributos } from '../../bloques/comandos'
import { cupoDeLaGaleria, subirALaGaleria } from '../../bloques/subir-a-la-guia.client'
import { usePendientes } from '../../bloques/subidas.client'
import type { BloqueElegido } from '../../hooks/use-bloque-elegido'

type Props = { editor: Editor; bloque: BloqueElegido; deshabilitado: boolean }
type Foto = { ruta: string; alt: string }

function fotosDe(bloque: BloqueElegido): Foto[] {
  const lista = bloque.atributos['imagenes']
  return Array.isArray(lista) ? (lista as Foto[]) : []
}

// Las imágenes de la galería (de 1 a 12): su descripción, quitar una y sumar más.
type PropsDeLaFila = {
  foto: Foto
  n: number
  unica: boolean
  deshabilitado: boolean
  alCambiar: (foto: Foto) => void
  alQuitar: () => void
}

// Una imagen de la galería: su miniatura, su descripción y quitarla (una galería no queda sin imágenes).
function FilaDeFoto({ foto, n, unica, deshabilitado, alCambiar, alQuitar }: PropsDeLaFila) {
  return (
    <li className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- la URL pública del bucket `web`; el editor no optimiza. */}
      <img
        src={urlPublica('web', foto.ruta)}
        alt=""
        className="size-14 rounded-(--radius-sm) object-cover"
      />
      <Input
        value={foto.alt}
        maxLength={MAXIMO_DEL_ALT}
        autoComplete="off"
        aria-label={`Descripción de la imagen ${n + 1}`}
        disabled={deshabilitado}
        className="min-h-11"
        onChange={(evento) => {
          alCambiar({ ...foto, alt: evento.target.value })
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-11"
        aria-label={`Quitar la imagen ${n + 1}`}
        title="Quitar la imagen"
        disabled={deshabilitado || unica}
        onClick={alQuitar}
      >
        <Trash2Icon aria-hidden />
      </Button>
    </li>
  )
}

export function OpcionesDeLaGaleria({ editor, bloque, deshabilitado }: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const fotos = fotosDe(bloque)
  const grupo = typeof bloque.atributos['subida'] === 'string' ? bloque.atributos['subida'] : null
  const subiendo = usePendientes(grupo).length
  const cupo = Math.max(0, MAXIMO_DE_IMAGENES_DE_LA_GALERIA - fotos.length - subiendo)
  const poner = (nuevas: Foto[]) => {
    cambiarAtributos(editor, bloque.indice, { imagenes: nuevas })
  }
  return (
    <div className="grid gap-3">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {fotos.length} de {MAXIMO_DE_IMAGENES_DE_LA_GALERIA} imágenes.
      </p>
      <ul className="grid gap-3">
        {fotos.map((foto, n) => (
          <FilaDeFoto
            key={foto.ruta}
            foto={foto}
            n={n}
            unica={fotos.length <= 1}
            deshabilitado={deshabilitado}
            alCambiar={(nueva) => {
              poner(fotos.map((f, m) => (m === n ? nueva : f)))
            }}
            alQuitar={() => {
              poner(fotos.filter((_, m) => m !== n))
            }}
          />
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit"
        disabled={deshabilitado || cupo === 0}
        onClick={() => selector.current?.click()}
      >
        {subiendo > 0 ? 'Subiendo…' : 'Agregar imágenes'}
      </Button>
      {cupo === 0 && subiendo === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La galería llegó a las {MAXIMO_DE_IMAGENES_DE_LA_GALERIA} imágenes.
        </p>
      ) : null}
      <input
        ref={selector}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir imágenes para la galería"
        onChange={(evento) => {
          const archivos = Array.from(evento.target.files ?? [])
          evento.target.value = ''
          if (archivos.length > 0 && cupoDeLaGaleria(editor, bloque.indice) > 0) {
            subirALaGaleria(editor, bloque.indice, archivos)
          }
        }}
      />
    </div>
  )
}
