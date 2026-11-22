'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import {
  secundariosDelResumen,
  type totalDelResumen,
  type ContextoDeHoja,
} from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../../../entities/primer-resultado'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import { TotalEnMonedaLocal } from './total-en-moneda-local'
import { ValorDeNodo } from './valor-de-nodo'
import { CIFRA_DEL_TOTAL, ETIQUETA_DEL_TOTAL, TARJETA_DEL_TOTAL } from './clases-del-total'

// Las piezas del resumen de la hoja (`ResumenDeHoja`): el total con sus avisos, el detalle y el fallo del recálculo. Las comparte la hoja en par (los dos totales).

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

// Pliega y abre el detalle del resumen al pie (4-50). Al costado (`@4xl/hoja`) no se dibuja: ahí el detalle se ve siempre. Sin ícono: la hoja más grande
// está a pocos nodos del techo de 500 (`cotizar-hoja-200.spec.ts`). Alto en px, como Live: con el texto al 200 % no dobla y el resumen plegado ocupa menos.
export function BotonDelDetalle({
  plegado,
  alternar,
  idDelDetalle,
}: {
  plegado: boolean
  alternar: () => void
  idDelDetalle: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-[44px] md:min-h-8 @4xl/hoja:hidden"
      aria-expanded={!plegado}
      aria-controls={idDelDetalle}
      onClick={alternar}
    >
      {plegado ? 'Ver el detalle' : 'Ocultar el detalle'}
    </Button>
  )
}

// El resumen: el total de la hoja, fijo (al pie en el celular y al costado, a la derecha de las secciones, desde un ancho de la hoja: `sticky`, 4.13-4b3) y lo que la tarjeta suma aparte. **No deja pasar por bueno un total viejo:** mientras
// se recalcula o si falló, el total se marca desactualizado con su texto. Los avisos van en una región viva; «Recalculando» no se anuncia (pasa cada 150 ms).
// El total en la moneda local y los secundarios del detalle.
export function SecundariosDelResumen({
  tarjeta,
  contexto,
  monedaDelTotalBs,
}: {
  tarjeta: HojaLista['tarjetaTotal']
  contexto: ContextoDeHoja
  monedaDelTotalBs: string | null
}) {
  return (
    <>
      {monedaDelTotalBs === null ? null : (
        <TotalEnMonedaLocal respuesta={contexto.respuesta} moneda={monedaDelTotalBs} />
      )}
      <ul className="grid gap-1">
        {secundariosDelResumen(tarjeta.secundarios, contexto.respuesta).map((s) => (
          <li
            key={s.nodo}
            className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)"
          >
            <span className="[overflow-wrap:anywhere]">{s.etiqueta}</span>
            <ValorDeNodo valor={s.valor} formato={s.formato} />
          </li>
        ))}
      </ul>
    </>
  )
}

// El total del resumen en su tarjeta, la opción del detalle (fuera de la tarjeta) y sus avisos (la hoja de siempre; la hoja en par pone los dos totales).
export function CabezaDelResumen({
  tarjeta,
  total,
  estado,
  variante,
  plegado,
  alternar,
  idDelDetalle,
}: {
  tarjeta: HojaLista['tarjetaTotal']
  total: ReturnType<typeof totalDelResumen>
  estado: EstadoDeRecalculo
  variante: string | undefined
  plegado: boolean
  alternar: () => void
  idDelDetalle: string
}) {
  return (
    <>
      <div data-tarjeta-del-total="" className={TARJETA_DEL_TOTAL}>
        <span className={ETIQUETA_DEL_TOTAL}>{tarjeta.etiqueta}</span>
        <strong data-total="" className={CIFRA_DEL_TOTAL}>
          {total.tipo === 'valor' ? (
            <Monto valor={total.usd} moneda={MONEDA_DEL_PRIMER_RESULTADO} />
          ) : (
            '—'
          )}
        </strong>
      </div>
      <BotonDelDetalle plegado={plegado} alternar={alternar} idDelDetalle={idDelDetalle} />
      <AvisosDelTotal total={total} estado={estado} variante={variante} />
    </>
  )
}
