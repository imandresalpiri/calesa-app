'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo, type ReactNode } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { ATRIBUTO_DEL_BLOQUE } from '../../../../entities/nucleo/paneles-de-la-unidad'
import {
  vistaActiva,
  type VistaDeLaTarjeta,
} from '../../../../entities/nucleo/vistas-de-la-tarjeta'
import { useAlPedirAbrirElHueco } from '../../hooks/eventos-de-la-unidad'

export type VistaConContenido = VistaDeLaTarjeta & { contenido: ReactNode }

type Props = {
  // La clave de la URL de la vista: la de la tarjeta (`?dinero=gastos|pagos|margen`).
  clave: string
  vistas: readonly VistaConContenido[]
}

// Con el drawer ya abierto, «abre ese hueco» (un atajo de «Qué falta») pasa a su vista.
function OyenteDeLaVista({ hueco, alPedir }: { hueco: string; alPedir: (hueco: string) => void }) {
  useAlPedirAbrirElHueco(hueco, () => {
    alPedir(hueco)
  })
  return null
}

/**
 * Las vistas del drawer de una tarjeta con varios huecos (Dinero): una pestaña por hueco, en la URL sin sumar al historial (`replace`). Sólo la que se ve se monta: el código y la
 * lectura de las otras se piden al elegirlas. Un `?panel=` de un hueco (un pago, un gasto, el desglose) muestra la suya. Las pestañas van a lo ancho, a 44 px en el celular.
 */
export function VistasDeLaTarjeta({ clave, vistas }: Props) {
  const parsers = useMemo(
    () => ({ [clave]: parseAsString, [CLAVE_DE_PANEL]: parseAsString }),
    [clave],
  )
  const [url, escribir] = useQueryStates(parsers)
  const activa = vistaActiva(vistas, {
    pedida: url[clave] ?? null,
    panel: url[CLAVE_DE_PANEL] ?? null,
  })
  const elegir = (valor: string) => {
    void escribir({ [clave]: valor }, { history: 'replace', scroll: false })
  }
  return (
    <Tabs
      value={activa}
      onValueChange={(valor) => {
        if (typeof valor === 'string' && vistas.some((v) => v.clave === valor)) elegir(valor)
      }}
      className="min-w-0 gap-4"
      data-vistas-de-la-tarjeta={clave}
    >
      <TabsList className="h-auto w-full">
        {vistas.map((v) => (
          <TabsTrigger key={v.clave} value={v.clave} className="min-h-11 md:min-h-9">
            {v.titulo}
          </TabsTrigger>
        ))}
      </TabsList>
      {vistas.map((v) => (
        <OyenteDeLaVista key={v.clave} hueco={v.clave} alPedir={elegir} />
      ))}
      {vistas.map((v) => (
        <TabsContent
          key={v.clave}
          value={v.clave}
          {...{ [ATRIBUTO_DEL_BLOQUE]: v.clave }}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] text-(length:--text-base)"
        >
          {v.clave === activa ? v.contenido : null}
        </TabsContent>
      ))}
    </Tabs>
  )
}
