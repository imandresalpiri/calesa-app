// Sube una imagen ya preparada al bucket privado `artes`, en el navegador, por el hash de su contenido: subir dos veces lo mismo es el mismo
// objeto. La fila la crea después la action; si no se crea, el objeto queda sin referencias y lo barre la cola de Storage.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { extensionDe } from '@/shared/lib/imagenes'
import { subirPorHash } from '@/shared/lib/supabase/almacen.client'
import type { ImagenPreparada } from '../entities/tipos'

export type ImagenSubida = Omit<ImagenPreparada, 'original' | 'miniatura'> & {
  ruta: string
  miniaturaRuta: string
}

const NO_SE_SUBIO = 'No pudimos subir la imagen. Prueba de nuevo.'

export async function subirImagen(preparada: ImagenPreparada): Promise<Resultado<ImagenSubida>> {
  const original = await subirPorHash({
    bucket: 'artes',
    carpeta: 'imagenes',
    contenido: preparada.original,
    extension: preparada.tipo,
  })
  if (!original.ok) {
    return original
  }
  const { tipo, ancho, alto } = preparada
  if (tipo === 'svg') {
    return ok({ tipo, ancho, alto, ruta: original.data.ruta, miniaturaRuta: original.data.ruta })
  }
  const extension = extensionDe(preparada.miniatura.type)
  if (extension === null) {
    return fallo('inesperado', NO_SE_SUBIO)
  }
  const miniatura = await subirPorHash({
    bucket: 'artes',
    carpeta: 'miniaturas',
    contenido: preparada.miniatura,
    extension,
  })
  if (!miniatura.ok) {
    return miniatura
  }
  return ok({ tipo, ancho, alto, ruta: original.data.ruta, miniaturaRuta: miniatura.data.ruta })
}

// La miniatura de una plantilla de arte que exportó el editor (480 px de lado mayor), a `miniaturas/<sha256>.<ext>`: WebP, o lo que haya dado
// el navegador si no sabe codificarlo (Safari: PNG o JPEG).
export async function subirMiniatura(miniatura: Blob): Promise<Resultado<{ ruta: string }>> {
  const extension = extensionDe(miniatura.type)
  if (extension === null) {
    return fallo('inesperado', NO_SE_SUBIO)
  }
  const subida = await subirPorHash({
    bucket: 'artes',
    carpeta: 'miniaturas',
    contenido: miniatura,
    extension,
  })
  return subida.ok ? ok({ ruta: subida.data.ruta }) : subida
}
