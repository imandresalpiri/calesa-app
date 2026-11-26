'use client'

import type { Route } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { urlPublica } from '@/shared/lib/almacen'
import { ResumenDeLaTarjeta, TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { MAXIMO_DE_IMAGENES_POR_ITEM } from '../../../entities/items/imagenes'
import { useImagenesDelPanel } from './imagenes-del-item-proveedor'

const MINIATURAS = 4

type Props = {
  // `?panel=imagenes&item=<id>` del proyecto del ítem: lo arma `src/app` (sirve también desde la Cadena).
  href: string
  descripcion: string
}

// La tarjeta «Imágenes» del panel del ítem: cuántas tiene («3 de 8 imágenes»: el tope es duro, por eso exacto) y sus miniaturas. Tocarla abre el panel de imágenes (`?panel=imagenes&item=`),
// donde se suben y se quitan. Lee lo que leyó el panel: no hace otra consulta.
export function TarjetaDeImagenes({ href, descripcion }: Props) {
  const router = useRouter()
  const imagenes = useImagenesDelPanel()
  const lectura = imagenes?.lectura.estado ?? 'leyendo'
  const lista = imagenes?.imagenes ?? []
  return (
    <TarjetaTocable
      densidad="compacta"
      titulo="Imágenes"
      accion="Abrir Imágenes"
      etiquetaDelMenu="Abrir…"
      motivo={null}
      abrir={() => {
        router.push(href as Route)
      }}
    >
      <ResumenDeLaTarjeta
        titulo="Imágenes"
        estado={lectura}
        alReintentar={() => {
          imagenes?.reintentar()
        }}
      >
        <p className="text-(length:--text-sm)">
          {lista.length === 0
            ? 'Este ítem aún no tiene imágenes'
            : `${String(lista.length)} de ${String(MAXIMO_DE_IMAGENES_POR_ITEM)} imágenes`}
        </p>
        {lista.length === 0 ? null : (
          <ul aria-hidden className="flex gap-1">
            {lista.slice(0, MINIATURAS).map((imagen) => (
              <li
                key={imagen.id}
                className="relative size-6 overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim)"
              >
                <Image
                  src={urlPublica('repuestos', imagen.ruta)}
                  alt={`Imagen de «${descripcion}»`}
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="24px"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </ResumenDeLaTarjeta>
    </TarjetaTocable>
  )
}
