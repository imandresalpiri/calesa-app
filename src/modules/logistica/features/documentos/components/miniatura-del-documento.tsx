'use client'

import { useState } from 'react'
import { FileIcon, FileTextIcon, ImageIcon } from 'lucide-react'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import {
  extensionDelArchivo,
  formaDelArchivo,
  usaMiniatura,
} from '../../../entities/documentos/vista-previa'
import type { Miniaturas } from '../hooks/use-miniaturas'

type Props = {
  documento: Pick<DocumentoDeLaUnidad, 'ruta' | 'mime' | 'nombre' | 'bytes'>
  miniaturas: Miniaturas
}

const CAJA =
  'flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2)'

function IconoDelArchivo({ documento }: Pick<PropsDeLaCaja, 'documento'>) {
  const forma = formaDelArchivo(documento)
  const clase = 'size-5 text-(--color-ink-soft)'
  if (forma === 'pdf') return <FileTextIcon className={clase} />
  if (forma === 'imagen') return <ImageIcon className={clase} />
  return <FileIcon className={clase} />
}

type PropsDeLaCaja = {
  documento: Pick<DocumentoDeLaUnidad, 'mime' | 'nombre'>
  // La imagen que se dibuja; `null` (o si falla y no se renueva) deja el icono de su tipo con la extensión en texto.
  url: string | null
  // La imagen no cargó: `true` si se pidió otra y se vuelve a intentar, `false` si ya no hay cómo.
  alFallar: () => Promise<boolean>
}

// La caja de una miniatura: la imagen o el icono con la extensión. Mide siempre lo mismo (56 px): la fila no cambia de alto cuando llega la imagen. Una URL que falla se renueva una vez; si falla otra
// vez, queda el icono.
export function CajaDeLaMiniatura({ documento, url, alFallar }: PropsDeLaCaja) {
  const [fallo, setFallo] = useState(false)
  if (url !== null && !fallo) {
    return (
      <span className={CAJA} data-miniatura-del-documento="imagen">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de un bucket privado o local: next/image no la puede optimizar. */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => {
            void alFallar().then((renovada) => {
              if (!renovada) setFallo(true)
            })
          }}
        />
      </span>
    )
  }
  return (
    <span className={CAJA} aria-hidden data-miniatura-del-documento="icono">
      <IconoDelArchivo documento={documento} />
      <span className="text-[10px] leading-none font-medium text-(--color-ink-soft)">
        {extensionDelArchivo(documento)}
      </span>
    </span>
  )
}

// La miniatura de un documento: su imagen (jpg, png o webp liviana, con la URL que pidió la lista entera de una vez) o, si no hay o es de otro tipo, el icono de su tipo.
export function MiniaturaDelDocumento({ documento, miniaturas }: Props) {
  const ruta = documento.ruta
  const url = ruta !== null && usaMiniatura(documento) ? miniaturas.url(ruta) : null
  return (
    <CajaDeLaMiniatura
      documento={documento}
      url={url}
      alFallar={() => (ruta === null ? Promise.resolve(false) : miniaturas.renovar(ruta))}
    />
  )
}
