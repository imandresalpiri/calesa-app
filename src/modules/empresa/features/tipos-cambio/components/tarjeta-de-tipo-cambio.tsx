'use client'

import { Badge } from '@/shared/ui/badge'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { TarjetaDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { decimalesDeValor, type TipoCambio } from '../../../entities/tipos-cambio'
import type { UltimoCambio } from '../../../entities/tipos-cambio-vigentes'
import { InterruptorEnLaBarra } from './interruptor-en-la-barra'

type Props = {
  tipo: TipoCambio
  // Todos: el tope de la barra y el por defecto a la vista salen de acá.
  tipos: readonly TipoCambio[]
  // Quién y cuándo cambió su valor la última vez, si se sabe (los activos).
  ultimoCambio: UltimoCambio | undefined
  puedeGestionar: boolean
  // Guardando algo: los interruptores esperan.
  enCurso: boolean
  alAbrir: () => void
  alUsarPorDefecto: () => void
  alCambiarEnLaBarra: (enLaBarra: boolean) => void
}

function accionesDe({
  tipo,
  puedeGestionar,
  enCurso,
  alAbrir,
  alUsarPorDefecto,
}: Props): AccionDeMenu[] {
  const motivo = puedeGestionar ? null : MOTIVO_SIN_PERMISO_TIPOS_CAMBIO
  return [
    {
      tipo: 'accion',
      clave: 'abrir',
      etiqueta: puedeGestionar ? 'Cambiar el valor' : 'Ver el valor',
      principal: true,
      despuesDeCerrar: true,
      alElegir: alAbrir,
    },
    ...(tipo.esDefault
      ? []
      : ([
          {
            tipo: 'accion',
            clave: 'por-defecto',
            etiqueta: 'Usar por defecto',
            deshabilitada: motivo !== null || !tipo.activo || enCurso,
            alElegir: alUsarPorDefecto,
          },
        ] satisfies AccionDeMenu[])),
    ...(motivo === null ? [] : ([{ tipo: 'nota', clave: 'motivo', texto: motivo }] as const)),
  ]
}

// Un tipo de cambio entre dos monedas: su nombre, su valor grande, quién y cuándo lo cambió y «En la barra». Tocar el valor abre su panel (valor
// e historial); el interruptor guarda al instante, con su tope de 3 y su motivo. Los dos controles son hermanos del botón: nada interactivo adentro de otro.
export function TarjetaDeTipoCambio(props: Props) {
  const { tipo, tipos, ultimoCambio, puedeGestionar, enCurso, alAbrir, alCambiarEnLaBarra } = props
  const { zonaHoraria } = useRegional()
  const cuando = formatearFechaHora(ultimoCambio?.en ?? tipo.actualizadoEn, { zona: zonaHoraria })
  return (
    <TarjetaDeAjustes
      titulo={tipo.nombre}
      estado={
        <>
          {tipo.esDefault ? <Badge variant="secondary">★ Por defecto</Badge> : null}
          {tipo.activo ? null : <Badge variant="outline">Inactivo</Badge>}
        </>
      }
      acciones={<MasAcciones nombre={tipo.nombre} acciones={accionesDe(props)} />}
    >
      <button
        type="button"
        className="-m-2 grid gap-0.5 rounded-(--radius-md) p-2 text-left outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
        onClick={alAbrir}
      >
        <span className="sr-only">Editar {tipo.nombre}: </span>
        <span className="text-(length:--text-sm) text-(--color-ink-faint)">
          1 {tipo.monedaDe} =
        </span>
        <Monto
          valor={tipo.valor}
          moneda={tipo.monedaA}
          decimales={decimalesDeValor(tipo.valor)}
          className="text-(length:--text-2xl) font-semibold break-words text-(--color-ink)"
        />
        <span className="text-(length:--text-xs) break-words text-(--color-ink-faint)">
          {ultimoCambio?.por ? `Cambiado por ${ultimoCambio.por} · ` : 'Cambiado '}
          {cuando}
        </span>
      </button>
      <InterruptorEnLaBarra
        titulo="En la barra"
        tipo={tipo}
        tipos={tipos}
        activo={tipo.activo}
        valor={tipo.enLaBarra}
        alCambiar={alCambiarEnLaBarra}
        bloqueado={!puedeGestionar || enCurso}
      />
    </TarjetaDeAjustes>
  )
}
