'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import {
  VIGENCIA_MAXIMA_DIAS,
  VIGENCIA_MINIMA_DIAS,
  type AjustesDeCotizacion,
} from '../../../entities/ajustes-de-cotizacion'
import { useModalDeVigencia } from '../hooks/use-modal-de-vigencia'

const ID_DE_LA_VIGENCIA = 'vigencia-dias'

type Props = {
  abierto: boolean
  alCerrar: () => void
  ajustes: AjustesDeCotizacion
  // Quien puede ver o gestionar los roles (`equipo.roles.ver` o `equipo.roles.gestionar`): ve el enlace a «Roles y permisos».
  puedeIrARoles: boolean
}

// «Vigencia» (`?panel=vigencia`): los días que vale una cotización, para todas las de todos los orígenes. Cada apertura empieza de lo guardado; la versión de la fila
// llega por props y nunca va en la `key` (guardar remontaría el modal y perdería lo escrito).
export function ModalDeVigencia(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeVigencia key={apertura} {...props} />
}

function FormularioDeVigencia({ abierto, alCerrar, ajustes, puedeIrARoles }: Props) {
  const modal = useModalDeVigencia({ ajustes, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="vigencia"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Vigencia"
      focoInicial={() => document.getElementById(ID_DE_LA_VIGENCIA)}
      formulario={modal.formulario}
      detalleDelConflicto="Lo que escribiste sigue acá."
    >
      <Campo
        nombre={ID_DE_LA_VIGENCIA}
        etiqueta="Vigencia (días)"
        type="number"
        inputMode="numeric"
        autoComplete="off"
        min={VIGENCIA_MINIMA_DIAS}
        max={VIGENCIA_MAXIMA_DIAS}
        value={modal.dias}
        onChange={(evento) => {
          modal.escribirDias(evento.target.value)
        }}
        error={modal.motivo ?? undefined}
        ayuda="Desde el día en que se creó, para todas las cotizaciones de todos los orígenes. Cambia también cuándo vence cada cotización ya guardada."
      />
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Si una cotización pide vehículo y lead se decide por rol y origen en «Roles y permisos».{' '}
        {puedeIrARoles ? (
          <Link
            href={RUTAS.roles as Route}
            className="font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
          >
            Ir a Roles y permisos
          </Link>
        ) : null}
      </p>
    </ModalDeFormulario>
  )
}
