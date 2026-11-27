'use client'

import type { ReactNode } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { CampoDeMonto } from '@/shared/ui/campo-de-monto'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import type { TipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'

const TASA_CON_CUATRO_DECIMALES = 4

/** Lo que el monto y el tipo de cambio leen del formulario de un gasto o de un pago. */
export type FormularioDeDinero = {
  valores: { moneda: string; monto: string; tipoCambioId: string }
  errores: Record<string, string>
  enCurso: boolean
  tipos: readonly TipoDeCambio[]
  escribir: (cambios: { moneda?: string; monto?: string; tipoCambioId?: string }) => void
}

/** Lo guardado de lo que se corrige: el equivalente que devolvió la base (acá nunca se multiplica). */
export type MontoGuardado = { moneda: string; montoBase: number; tipoCambioAplicado: number | null }

type Props = {
  prefijo: 'gasto' | 'pago'
  opciones: OpcionesDeGasto | null
  original: MontoGuardado | null
  formulario: FormularioDeDinero
  estado?: ReactNode
}

// Bajo el monto: el equivalente guardado (en la misma moneda) o, con otra moneda, quién lo calcula. El renglón queda reservado en la moneda base.
function PieDelMonto({ original, moneda }: { original: MontoGuardado | null; moneda: string }) {
  const { locale, monedaBase } = useRegional()
  if (moneda === monedaBase) return null
  if (original && original.moneda === moneda && original.tipoCambioAplicado !== null) {
    return (
      <>
        Equivale a <Monto valor={original.montoBase} />, a{' '}
        {formatearNumero(original.tipoCambioAplicado, {
          locale,
          decimales: TASA_CON_CUATRO_DECIMALES,
        })}
        .
      </>
    )
  }
  return `La base guarda el equivalente en ${monedaBase} con el valor de este momento.`
}

/** El monto con su moneda en un solo campo (`CampoDeMonto`), lo primero de un gasto o un pago. Mientras llegan las monedas, sólo la elegida, apagada. */
export function MontoDelFormulario({ prefijo, opciones, original, formulario: f, estado }: Props) {
  const monedas = opciones
    ? opciones.monedas.map((m) => ({ valor: m.codigo, etiqueta: `${m.codigo} · ${m.nombre}` }))
    : [{ valor: f.valores.moneda, etiqueta: f.valores.moneda }]
  return (
    <CampoDeMonto
      prefijo={prefijo}
      monedas={monedas}
      moneda={f.valores.moneda}
      monto={f.valores.monto}
      alCambiarMoneda={(moneda) => {
        f.escribir({ moneda })
      }}
      alCambiarMonto={(monto) => {
        f.escribir({ monto })
      }}
      errorDeMoneda={f.errores['moneda']}
      errorDeMonto={f.errores['monto']}
      deshabilitado={f.enCurso || opciones === null}
      estado={estado}
      pie={<PieDelMonto original={original} moneda={f.valores.moneda} />}
    />
  )
}
