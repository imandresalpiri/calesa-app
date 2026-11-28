'use client'

// Si la imagen de una capa (de la biblioteca, el logo, una foto del vehículo o la tarjeta) cargó, en el inspector del editor de artes: la
// misma carga que usa el lienzo (con el tamaño de la capa de respaldo, como él), que se pide de nuevo sólo si cambia lo que se dibuja. Sin
// fuente (el vehículo de ejemplo no tiene esa foto, no hay cotización, el logo no tiene esa variante), lo dice: la capa no se dibuja. La
// línea ocupa siempre su lugar: aparecer el aviso no corre nada.
import type { CapaConImagen } from '../../../../entities/documento'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'
import { useImagenDelLienzo } from '../../hooks/use-imagen-del-lienzo'

type Props = { capa: CapaConImagen; fuente: FuenteDeImagen | null }

const TEXTOS = { cargando: 'Cargando la imagen…', lista: '', fallo: 'No se pudo cargar la imagen.' }
const SIN_FUENTE = 'Sin este dato con el vehículo de ejemplo.'

const TENUE = 'min-h-4 text-(length:--text-xs) leading-4 text-(--color-ink-faint)'
const DE_PELIGRO = 'min-h-4 text-(length:--text-xs) leading-4 text-(--color-peligro-ink)'

export function EstadoDeLaImagen({ capa, fuente }: Props) {
  const { estado } = useImagenDelLienzo(fuente, { ancho: capa.ancho, alto: capa.alto })
  if (!fuente) {
    return (
      <p role="status" className={TENUE}>
        {SIN_FUENTE}
      </p>
    )
  }
  return (
    <p role="status" className={estado === 'fallo' ? DE_PELIGRO : TENUE}>
      {TEXTOS[estado]}
    </p>
  )
}
