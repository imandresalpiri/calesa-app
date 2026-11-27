'use client'

import type { ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { textoDelSello, type Pago } from '../../../entities/dinero/pago'
import { CampoDeComprobante } from './campo-de-comprobante'

const TASA_CON_CUATRO_DECIMALES = 4

type Props = {
  unidadId: string
  pago: Pago
  // Por qué no se edita (un confirmado queda sellado; sin permiso, a quién pedirlo).
  motivo: string
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

// Un pago en sólo lectura (`?panel=pago&pago=<id>` de uno confirmado, o de cualquiera sin permiso de editar): la misma forma del formulario, sin campos. Arriba el monto, el estado con su sello, la
// fecha y el concepto; luego el comprobante (su vista previa y «Ver comprobante») y «Más datos» (método, tipo de cambio y notas). El pie («Cerrar», «Anular pago») es del modal.
export function LecturaDelPago({ unidadId, pago, motivo }: Props) {
  const { locale, monedaBase, zonaHoraria } = useRegional()
  const sello = textoDelSello(pago, zonaHoraria)
  const enOtraMoneda = pago.moneda !== monedaBase
  return (
    <div className="grid gap-4">
      <div className="grid gap-5">
        <div className="grid gap-3">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Monto</span>
            <Badge variant={pago.confirmado ? 'secondary' : 'outline'}>
              {pago.confirmado ? 'Confirmado' : 'Sin confirmar'}
            </Badge>
          </div>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-(length:--text-xl) font-semibold text-(--color-ink)">
            <Monto valor={pago.monto} moneda={pago.moneda} />
            {enOtraMoneda ? (
              <span className="text-(length:--text-sm) font-normal text-(--color-ink-soft)">
                Equivale a <Monto valor={pago.montoBase} />
              </span>
            ) : null}
          </p>
          <p
            className="min-h-5 text-(length:--text-sm) text-(--color-ink-soft)"
            data-sello={pago.confirmado ? 'confirmado' : 'sin-confirmar'}
          >
            {sello ?? motivo}
          </p>
          <dl className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <Dato etiqueta="Fecha">{formatearFecha(pago.fecha, { zona: zonaHoraria })}</Dato>
            <Dato etiqueta="Concepto">{pago.concepto}</Dato>
          </dl>
        </div>
        <CampoDeComprobante
          unidadId={unidadId}
          ruta={pago.comprobanteRuta ?? ''}
          alCambiar={() => undefined}
          deshabilitado
          soloLectura
        />
        <GrupoDeCampos titulo="Más datos">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Método">{pago.metodo ?? '—'}</Dato>
            <Dato etiqueta="Tipo de cambio">
              {enOtraMoneda && pago.tipoCambioAplicado !== null
                ? formatearNumero(pago.tipoCambioAplicado, {
                    locale,
                    decimales: TASA_CON_CUATRO_DECIMALES,
                  })
                : `No aplica: es en ${monedaBase}`}
            </Dato>
            <Dato etiqueta="Notas">
              <span className="whitespace-pre-wrap">{pago.notas ?? '—'}</span>
            </Dato>
          </dl>
        </GrupoDeCampos>
      </div>
    </div>
  )
}
