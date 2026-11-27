// Lo que se lee de las plantillas de arte y de la biblioteca de imágenes, ya con nombres de la app. Las versiones (`actualizadoEn`) viajan como
// el texto que dio la base: pasarlas por `Date` pierde los microsegundos y la RPC respondería `PT409` en vano. Nunca el documento: la lista no
// lo lee. Puro.
import type { ClaveDeFormato, TipoDeArte } from './formatos'

export type VisibilidadDeArte = 'privada' | 'empresa'
export type AmbitoDeImagen = 'personal' | 'empresa'
export type TipoDeImagen = 'webp' | 'png' | 'jpg' | 'svg'

export type PlantillaDeArte = {
  id: string
  nombre: string
  formato: ClaveDeFormato
  ancho: number
  alto: number
  origenId: string
  visibilidad: VisibilidadDeArte
  autorId: string
  autorNombre: string | null
  // La URL firmada de la miniatura (600 s), o nula si todavía no tiene.
  miniaturaUrl: string | null
  actualizadoEn: string
}

export type ImagenDeArte = {
  id: string
  nombre: string
  tipo: TipoDeImagen
  ancho: number
  alto: number
  ambito: AmbitoDeImagen
  duenoId: string | null
  miniaturaUrl: string | null
  actualizadoEn: string
}

// La plantilla por defecto de quien mira en un origen, para imagen o para PDF (`artes_por_defecto`).
export type PorDefecto = {
  origenId: string
  tipo: TipoDeArte
  plantillaId: string
  actualizadoEn: string
}

export type PaginaDeArtes<Fila> = { filas: Fila[]; siguiente: string | null }

// Un origen donde quien mira ve cotizaciones (`origenesDeArtes()`): filtra la lista y nombra el de cada tarjeta. Una plantilla de arte nueva
// nace sólo en uno activo.
export type OrigenDeArtes = { id: string; nombre: string; activo: boolean }

// Una imagen lista para subir a la biblioteca: el original que se guarda (o su versión reducida) y su miniatura de 480 px (la misma en un SVG).
export type ImagenPreparada = {
  original: Blob
  miniatura: Blob
  tipo: TipoDeImagen
  ancho: number
  alto: number
}
