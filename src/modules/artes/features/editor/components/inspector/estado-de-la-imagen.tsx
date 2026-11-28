'use client'

// Si la imagen de una capa (de la biblioteca, el logo, una foto del vehículo o la tarjeta) cargó, en el inspector del editor de artes: la
// misma carga que usa el lienzo (con el tamaño de la capa de respaldo, como él), que se pide de nuevo sólo si cambia lo que se dibuja. La
// línea ocupa siempre su lugar: aparecer el aviso no corre nada.
import type { CapaConImagen } from '../../../../entities/documento'
import { fuenteDeLaCapa } from '../../../../entities/editor/fuente-de-la-capa'
import type { LogoDelEditor } from '../../../../entities/tipos'
import { useImagenDelLienzo } from '../../hooks/use-imagen-del-lienzo'

type Props = { capa: CapaConImagen; logos: readonly LogoDelEditor[] }

const TEXTOS = { cargando: 'Cargando la imagen…', lista: '', fallo: 'No se pudo cargar la imagen.' }

export function EstadoDeLaImagen({ capa, logos }: Props) {
  const { estado } = useImagenDelLienzo(fuenteDeLaCapa(capa, logos), {
    ancho: capa.ancho,
    alto: capa.alto,
  })
  return (
    <p
      role="status"
      className={
        estado === 'fallo'
          ? 'min-h-4 text-(length:--text-xs) leading-4 text-(--color-peligro-ink)'
          : 'min-h-4 text-(length:--text-xs) leading-4 text-(--color-ink-faint)'
      }
    >
      {TEXTOS[estado]}
    </p>
  )
}
