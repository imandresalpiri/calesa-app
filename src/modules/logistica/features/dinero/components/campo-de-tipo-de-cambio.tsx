'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useRegional } from '@/shared/ui/regional'
import { etiquetaDeTipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import type { FormularioDeDinero } from './monto-del-formulario'

// El tipo de cambio de «Más datos»: ocupa su lugar aunque la moneda sea la base (apagado, con su motivo), así elegir otra moneda no mueve lo de abajo. Sin un tipo activo para la
// moneda lo dice ahí mismo; al enviar, el motivo dice a quién pedírselo.
export function CampoDeTipoDeCambio({
  prefijo,
  formulario: f,
}: {
  prefijo: 'gasto' | 'pago'
  formulario: FormularioDeDinero
}) {
  const { locale, monedaBase } = useRegional()
  const { valores, errores, enCurso, tipos } = f
  const esBase = valores.moneda === monedaBase
  const primera = esBase
    ? `No aplica: es en ${monedaBase}`
    : tipos.length === 0
      ? `Sin tipo de cambio activo para ${valores.moneda}`
      : 'Elige el tipo de cambio'
  return (
    <CampoSeleccion
      nombre={`${prefijo}-tipo-de-cambio`}
      etiqueta="Tipo de cambio"
      opciones={[
        { valor: '', etiqueta: primera },
        ...(esBase
          ? []
          : tipos.map((t) => ({ valor: t.id, etiqueta: etiquetaDeTipoDeCambio(t, locale) }))),
      ]}
      value={esBase ? '' : valores.tipoCambioId}
      onChange={(evento) => {
        f.escribir({ tipoCambioId: evento.target.value })
      }}
      error={errores['tipoCambioId']}
      disabled={enCurso || esBase}
    />
  )
}
