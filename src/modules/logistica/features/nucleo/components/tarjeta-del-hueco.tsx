'use client'

import type { ReactNode } from 'react'
import { CLAVE_DE_SECCION_DEL_ITEM } from '@/shared/lib/filtros'
import { Drawer } from '@/shared/ui/drawer'
import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

type Props = {
  // La clave del hueco (`documentos`, `notas`, `historial`): con ella el atajo de una falta encuentra la tarjeta y la abre.
  clave: string
  titulo: string
  // Una línea fija que dice qué hay adentro: sin lectura ni total (un número que se muestra nunca es un total exacto).
  resumen: string
  // El hueco ya dibujado por el servidor (con su límite de error): se monta cuando el drawer se abre.
  contenido: ReactNode
}

// La tarjeta de un hueco de logística en el panel del ítem (Documentos, Notas, Historial): su título, qué hay adentro y, tocándola o desde su «⋯», el hueco completo en un drawer al costado
// (`?seccion=<clave>`: un `?panel=` cerraría el panel del ítem). Alto fijo: no lee nada hasta que se abre. El atajo de una falta («Subir», «Revisar») abre el drawer y el hueco, ya montado, atiende el resto.
export function TarjetaDelHueco({ clave, titulo, resumen, contenido }: Props) {
  const url = usePanelPorUrl(clave, [], { clave: CLAVE_DE_SECCION_DEL_ITEM })
  useAlPedirAbrirElHueco(clave, () => {
    if (!url.abierto) url.abrir()
  })
  return (
    <>
      <div {...{ [ATRIBUTO_DEL_BLOQUE]: clave }} className="min-w-0">
        <TarjetaTocable
          densidad="compacta"
          titulo={titulo}
          accion={`Abrir ${titulo}`}
          etiquetaDelMenu="Abrir…"
          motivo={null}
          abrir={() => {
            url.abrir()
          }}
        >
          <p className="min-h-10 text-(length:--text-sm) text-(--color-ink-soft)">{resumen}</p>
        </TarjetaTocable>
      </div>
      <Drawer abierto={url.abierto} alCerrar={url.cerrar} titulo={titulo} ancho="amplio">
        <div {...{ [ATRIBUTO_DEL_BLOQUE]: clave }} className="min-w-0">
          {contenido}
        </div>
      </Drawer>
    </>
  )
}
