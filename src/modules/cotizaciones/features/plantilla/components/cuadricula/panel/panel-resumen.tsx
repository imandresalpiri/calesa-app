'use client'

import Link from 'next/link'
import { formatearNumero } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  ANCHO_DE_COLUMNA,
  ANCHO_TOTAL_MAXIMO,
  TOPE_EN_BYTES_DE_LA_CUADRICULA,
  type PlantillaEnCuadricula,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { rotuloDeColumna } from '../../../../../entities/plantilla/edicion/columnas'
import { anchoTotal } from '../../../../../entities/plantilla/edicion/limites'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'
import { CampoDeNumero } from './campo-de-numero'
import { SeccionDelPanel } from './seccion-del-panel'

type Props = {
  plantilla: PlantillaEnCuadricula
  tonos: readonly TonoDelCatalogo[]
  bytes: number
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
}

// «Columnas» (el panel que abre su botón en la barra): las columnas con su ancho (que se edita en número), «Σ ancho N / 1.600 px» y «Sumar columna»; la paleta (los colores del catálogo,
// sólo para ver: se editan en «Orígenes › Colores») y el tamaño contra el tope de 24 KiB, que es el que manda.
export function PanelResumen({ plantilla, tonos, bytes, hacer, ocupado }: Props) {
  const { locale } = useRegional()
  const kib = (n: number) => formatearNumero(n / 1024, { decimales: 1, locale })
  return (
    <div className="grid min-w-0 gap-4" data-panel-resumen="">
      <SeccionDelPanel titulo="Columnas">
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {plantilla.columnas.map((c, k) => (
            <li key={c.id} className="min-w-0">
              <CampoDeNumero
                etiqueta={rotuloDeColumna(k, c.id)}
                valor={c.ancho}
                minimo={ANCHO_DE_COLUMNA.minimo}
                maximo={ANCHO_DE_COLUMNA.maximo}
                alCambiar={(ancho) => {
                  hacer({ tipo: 'ancho', columna: k, ancho })
                }}
              />
            </li>
          ))}
        </ul>
        <p className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
          Σ ancho {formatearNumero(anchoTotal(plantilla), { locale })} /{' '}
          {formatearNumero(ANCHO_TOTAL_MAXIMO, { locale })} px
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full md:min-h-9"
          disabled={ocupado}
          onClick={() => {
            hacer({ tipo: 'sumarColumna' })
          }}
        >
          Sumar columna
        </Button>
      </SeccionDelPanel>
      <SeccionDelPanel titulo="Paleta">
        <ul className="flex min-w-0 flex-wrap gap-1.5">
          {tonos.flatMap((t) =>
            t.hex === undefined
              ? []
              : [
                  <li key={t.clave} className="flex items-center gap-1 text-(length:--text-xs)">
                    <span
                      aria-hidden
                      className="size-4 rounded-(--radius-sm) border border-(--color-line-strong)"
                      style={{ background: t.hex }}
                    />
                    {t.nombre}
                  </li>,
                ],
          )}
        </ul>
        <Link
          href={RUTAS.coloresDeCotizacion}
          className="text-(length:--text-sm) text-(--color-primario-ink) underline-offset-2 hover:underline"
        >
          Editar en Orígenes › Colores
        </Link>
      </SeccionDelPanel>
      <p
        className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums"
        data-tamano-de-la-tarjeta=""
      >
        Tamaño: {kib(bytes)} de {kib(TOPE_EN_BYTES_DE_LA_CUADRICULA)} KiB
      </p>
    </div>
  )
}
