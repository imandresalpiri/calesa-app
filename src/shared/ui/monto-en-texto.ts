'use client'

import { formatearMonto, formatearMontoSinMoneda } from '@/shared/lib/formato'
import { useLive } from './live'
import { useRegional } from './regional'

type Opciones = { moneda?: string; decimales?: number }

// Un monto que no puede ir en el DOM (un `title`, un `aria-label`, un aviso, el título de un `<Confirmar>`): el CSS del Modo Live no lo
// alcanza, así que se arma con el modo ya leído. Con el Live, el número sin su moneda, como `<Monto>`; sin él, con su moneda. En el
// servidor y al hidratar `useLive()` da apagado: el atributo se corrige al hidratar.
export function useMontoEnTexto(): (valor: number, opciones?: Opciones) => string {
  const { locale, monedaBase } = useRegional()
  const { live } = useLive()
  return (valor, opciones = {}) => {
    const formatear = live ? formatearMontoSinMoneda : formatearMonto
    return formatear(valor, {
      moneda: opciones.moneda ?? monedaBase,
      locale,
      ...(opciones.decimales === undefined ? {} : { decimales: opciones.decimales }),
    })
  }
}
