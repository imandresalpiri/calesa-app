'use client'

import { use, type ReactNode } from 'react'
import { MontoConDecimales } from '@/shared/ui/monto-con-decimales'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../../../entities/primer-resultado'
import { CIFRA_DEL_TOTAL, ETIQUETA_DEL_TOTAL, TARJETA_EN_LA_SECCION } from './clases-del-total'
import { ContextoDelTotal } from './contexto-del-total'
import { AvisoDeFallo, AvisosDelTotal, SecundariosDelTotal } from './partes-del-total'

// La tarjeta del total: su rótulo y el total de la hoja (`totalDelResumen()`) por `<Monto>` (respeta el Modo Live), con los «Decimales» de su nodo.
export function TarjetaDelTotal({
  etiqueta,
  decimales,
  contexto,
}: {
  etiqueta: string
  decimales: number | undefined
  contexto: ContextoDeHoja
}) {
  const total = totalDelResumen(contexto)
  return (
    <div data-tarjeta-del-total="" className={TARJETA_EN_LA_SECCION}>
      <span className={ETIQUETA_DEL_TOTAL}>{etiqueta}</span>
      <strong data-total="" className={CIFRA_DEL_TOTAL}>
        {total.tipo === 'valor' ? (
          <MontoConDecimales
            valor={total.usd}
            moneda={MONEDA_DEL_PRIMER_RESULTADO}
            decimales={decimales}
          />
        ) : (
          '—'
        )}
      </strong>
    </div>
  )
}

// La región del total (`data-total-de-la-hoja`, ocupada mientras recalcula): la tarjeta y, debajo y fuera de ella, sus avisos en una región viva (desactualizado, por qué
// falta, qué elegir, el fallo con «Reintentar» o «Recargar», el vehículo que no se pudo usar), el total con que se guardó, lo pisado y lo que suma aparte. **No deja pasar
// por bueno un total viejo:** mientras se recalcula o si falló, lo dice con texto. La línea de los avisos guarda su alto (una línea): recalcular no mueve la hoja.
// «Recalculando» no se anuncia (pasa cada 150 ms). En par, `totales` (los dos, cada uno con lo suyo) reemplaza a la tarjeta, sus avisos y lo que suma aparte. Sin
// `ContextoDelTotal` (el lienzo del editor, la hoja de prueba), la tarjeta sola.
export function RegionDelTotal({
  etiqueta,
  decimales,
  contexto,
  totales = null,
}: {
  etiqueta: string
  decimales: number | undefined
  contexto: ContextoDeHoja
  totales?: ReactNode
}) {
  const del = use(ContextoDelTotal)
  if (del === null) {
    return (
      totales ?? <TarjetaDelTotal etiqueta={etiqueta} decimales={decimales} contexto={contexto} />
    )
  }
  const { estado } = del
  const ocupado = estado.tipo === 'esperando' || estado.tipo === 'recalculando'
  return (
    <div
      data-total-de-la-hoja=""
      data-viejo={estado.tipo !== 'al_dia'}
      aria-busy={ocupado}
      className="grid min-w-0 content-start gap-2"
    >
      {totales ?? <TarjetaDelTotal etiqueta={etiqueta} decimales={decimales} contexto={contexto} />}
      <div role="status" className="grid min-h-[1lh] gap-1 text-(length:--text-sm)">
        {totales === null ? (
          <>
            <AvisosDelTotal
              total={totalDelResumen(contexto)}
              estado={estado}
              variante={contexto.indice.variante?.etiqueta}
            />
            <AvisoDeFallo
              estado={estado}
              alReintentar={del.alReintentar}
              alRecargar={del.alRecargar}
            />
          </>
        ) : null}
        {del.avisoDelVehiculo === null ? null : (
          <p className="text-(--color-ink-soft)">{del.avisoDelVehiculo}</p>
        )}
      </div>
      {del.totalGuardado}
      {del.pisadas}
      {totales === null ? (
        <SecundariosDelTotal
          secundarios={del.secundarios}
          contexto={contexto}
          monedaDelTotalBs={del.monedaDelTotalBs}
          decimalesDelTotal={decimales}
        />
      ) : null}
    </div>
  )
}
