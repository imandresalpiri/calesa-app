'use client'

import type { ReactNode } from 'react'
import {
  lineasPorBloque,
  type CotizacionConLineas,
} from '../../../entities/cotizador/hoja-de-lectura'
import { CabeceraDeCotizacion } from './cabecera-de-cotizacion'
import { CondicionesDeLaHoja } from './condiciones-de-la-hoja'
import { LineasDelBloque } from './lineas-del-bloque'

type Props = CotizacionConLineas & {
  proyecto: { id: string; numero: number }
  // El cliente del proyecto, ya dibujado por `src/app`.
  cliente: ReactNode
  // «Anular» de una borrador o aceptada con el proyecto abierto (8.12-4, D48).
  acciones?: React.ReactNode
  // Por qué una borrador se ve en sólo lectura (el proyecto cerrado).
  nota?: string
}

// La hoja de una cotización de repuestos en sólo lectura (8.12-3, C13): la misma cabecera que la editable (con el total que guardó la base: D36, nada se
// recalcula y nulo es «Sin total»), los bloques «Importado» y «Local» y «Condiciones». Es la de una aceptada, una anulada o una borrador que no se puede
// editar (8.12-4, D41); la editable es `hoja-editable.tsx`.
export function HojaDeLectura({ cotizacion, lineas, proyecto, cliente, acciones, nota }: Props) {
  const { importado, local } = lineasPorBloque(lineas)
  return (
    <div className="grid gap-6">
      <CabeceraDeCotizacion
        cotizacion={cotizacion}
        proyecto={proyecto}
        cliente={cliente}
        total={cotizacion.total}
        acciones={acciones}
      />
      {nota ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {nota}
        </p>
      ) : null}
      <LineasDelBloque
        id="bloque-importado"
        titulo="Importado"
        lineas={importado}
        moneda={cotizacion.moneda}
      />
      <LineasDelBloque id="bloque-local" titulo="Local" lineas={local} moneda={cotizacion.moneda} />
      <CondicionesDeLaHoja cotizacion={cotizacion}>
        <div className="grid gap-1">
          <p className="text-(length:--text-sm) font-medium">Notas</p>
          <p className="text-(length:--text-sm) whitespace-pre-line text-(--color-ink-soft)">
            {cotizacion.notas ?? 'Sin notas.'}
          </p>
        </div>
      </CondicionesDeLaHoja>
    </div>
  )
}
