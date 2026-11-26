'use client'

import { Button } from '@/shared/ui/button'
import {
  secundariosDelResumen,
  type totalDelResumen,
  type ContextoDeHoja,
} from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import { TotalEnMonedaLocal } from './total-en-moneda-local'
import { ValorDeNodo } from './valor-de-nodo'

// Lo que va debajo de la tarjeta del total (`RegionDelTotal`), fuera de ella: sus avisos, el fallo del recálculo y lo que la tarjeta suma aparte. Las comparte la hoja en
// par (los dos totales).

export function AvisoDeFallo({
  estado,
  alReintentar,
  alRecargar,
}: {
  estado: EstadoDeRecalculo
  alReintentar: () => void
  alRecargar: () => void
}) {
  if (estado.tipo !== 'fallo') {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
        No se pudo recalcular.
      </p>
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={estado.recargar ? alRecargar : alReintentar}
      >
        {estado.recargar ? 'Recargar' : 'Reintentar'}
      </Button>
    </div>
  )
}

// Lo que el total dice de sí mismo: que está desactualizado, por qué falta o qué elegir para calcular.
export function AvisosDelTotal({
  total,
  estado,
  variante,
}: {
  total: ReturnType<typeof totalDelResumen>
  estado: EstadoDeRecalculo
  variante: string | undefined
}) {
  return (
    <>
      {estado.tipo !== 'al_dia' && total.tipo === 'valor' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Total desactualizado.</p>
      ) : null}
      {total.tipo === 'faltante' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Sin total: {total.motivo}</p>
      ) : null}
      {estado.tipo === 'sin_variante' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Elige {variante?.toLowerCase() ?? 'una opción'} para calcular.
        </p>
      ) : null}
    </>
  )
}

// Lo que la tarjeta suma aparte: el total en la moneda local (con «Ver total en moneda local», con los decimales del total) y los secundarios del diseño.
export function SecundariosDelTotal({
  secundarios,
  contexto,
  monedaDelTotalBs,
  decimalesDelTotal,
}: {
  secundarios: HojaLista['tarjetaTotal']['secundarios']
  contexto: ContextoDeHoja
  monedaDelTotalBs: string | null
  decimalesDelTotal: number | undefined
}) {
  return (
    <>
      {monedaDelTotalBs === null ? null : (
        <TotalEnMonedaLocal
          respuesta={contexto.respuesta}
          moneda={monedaDelTotalBs}
          decimales={decimalesDelTotal}
        />
      )}
      <ul className="grid gap-1 empty:hidden">
        {secundariosDelResumen(secundarios, contexto.respuesta).map((s) => (
          <li
            key={s.nodo}
            className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)"
          >
            <span className="[overflow-wrap:anywhere]">{s.etiqueta}</span>
            <ValorDeNodo valor={s.valor} formato={s.formato} decimales={s.decimales} />
          </li>
        ))}
      </ul>
    </>
  )
}
