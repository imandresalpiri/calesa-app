'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { DestinoDeLaAyuda } from '../../../entities/destino-de-la-ayuda'
import {
  celdaDeTabla,
  type CeldaDeTabla,
  type ColumnaDeTabla,
  type FilaDeTabla,
} from '../../../entities/tabla-de-ayuda'

// Si las cifras van como dinero (P13): pasan por `<Monto>` con la moneda de la celda y el Modo Live las tapa. Nulo, a la vista.
export type DineroDeLaAyuda = { moneda: string | undefined } | null

// Cómo se elige un valor: el destino de cada columna, qué hace el clic y el nombre del botón (con el Modo Live ya resuelto).
export type Eleccion = {
  llenaPor: ReadonlyMap<string, DestinoDeLaAyuda>
  alElegir: (destino: DestinoDeLaAyuda, valor: number) => void
  nombre: (destino: DestinoDeLaAyuda, valor: number) => string
}

// Lo que el hueco de la edición (área `tablas`) pone en una fila: sus acciones (✎ y 🗑, o «Volver») en la última columna, si está tachada (quitada hasta guardar) y,
// abierta, el campo de cada columna en lugar de su valor.
export type FilaEditadaDeLaAyuda = {
  acciones: ReactNode
  quitada: boolean
  campo: ((columna: ColumnaDeTabla) => ReactNode) | null
}

function ContenidoDeLaCelda({ celda, dinero }: { celda: CeldaDeTabla; dinero: DineroDeLaAyuda }) {
  return celda.tipo === 'cifra' && dinero !== null ? (
    <Monto valor={celda.valor} moneda={dinero.moneda} />
  ) : (
    celda.texto
  )
}

function TuVehiculo() {
  return (
    <span className="me-2 inline-flex rounded-4xl bg-(--color-primario) px-2 py-0.5 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-sobre-primario)">
      Tu vehículo
    </span>
  )
}

function ValorQueLlena({
  nombre,
  alElegir,
  children,
}: {
  nombre: string
  alElegir: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={nombre}
      className="-mx-2 -my-1 inline-flex min-h-11 min-w-11 items-center justify-end rounded-(--radius-sm) px-2 font-medium text-(--color-primario-ink) underline decoration-dotted underline-offset-4 outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus)"
      onClick={alElegir}
    >
      {children}
    </button>
  )
}

// Una fila: cada cifra de una columna que llena es un botón que la escribe en su celda (lo que se ve no cambia; el nombre dice qué hace). La del vehículo va resaltada y
// con «Tu vehículo» delante de su primer valor. Con la edición, sus acciones al final, tachada si se quitó y, abierta, sus campos.
export function FilaDeLaAyuda({
  fila,
  columnas,
  dinero,
  eleccion,
  delVehiculo,
  editada,
}: {
  fila: FilaDeTabla
  columnas: readonly ColumnaDeTabla[]
  dinero: DineroDeLaAyuda
  eleccion: Eleccion | null
  delVehiculo: boolean
  editada: FilaEditadaDeLaAyuda | null
}) {
  const { locale } = useRegional()
  return (
    <tr
      data-fila-del-vehiculo={delVehiculo ? '' : undefined}
      data-quitada={editada?.quitada ? '' : undefined}
      className={cn(
        'border-b border-(--color-line) last:border-b-0',
        delVehiculo && 'bg-(--color-primario-soft)',
        editada?.quitada && 'text-(--color-ink-soft) line-through',
      )}
    >
      {columnas.map((columna, j) => {
        const celda = celdaDeTabla(fila[columna.clave], columna.tipo, locale)
        const destino = eleccion?.llenaPor.get(columna.clave)
        const contenido = <ContenidoDeLaCelda celda={celda} dinero={dinero} />
        const campo = editada?.campo
        return (
          <td
            key={columna.clave}
            className={cn(
              'px-3 py-2 align-top',
              celda.tipo === 'cifra'
                ? 'text-right whitespace-nowrap tabular-nums'
                : 'wrap-anywhere',
            )}
          >
            {delVehiculo && j === 0 ? <TuVehiculo /> : null}
            {campo ? (
              campo(columna)
            ) : eleccion && destino && celda.tipo === 'cifra' ? (
              <ValorQueLlena
                nombre={eleccion.nombre(destino, celda.valor)}
                alElegir={() => {
                  eleccion.alElegir(destino, celda.valor)
                }}
              >
                {contenido}
              </ValorQueLlena>
            ) : (
              contenido
            )}
          </td>
        )
      })}
      {editada ? (
        <td className="px-2 py-1 align-top whitespace-nowrap no-underline">{editada.acciones}</td>
      ) : null}
    </tr>
  )
}
