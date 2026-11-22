'use client'

import { Button } from '@/shared/ui/button'
import { AccionesEnLaBarra } from '../../../../barra-de-la-formula/components'
import {
  MENSAJE_DE_ERROR,
  MENSAJE_DE_REGLA,
  MENSAJE_SIN_RESPUESTA,
  SE_GUARDO,
  SIN_CAMBIOS,
  type EstadoDelGuardado,
} from '../../../hooks/use-guardar-borrador.soporte'

type Props = {
  nombreDelOrigen: string
  enCurso: boolean
  estado: EstadoDelGuardado
  // Por qué espera (lo abierto, el rechazo, sin cambios); nulo: listo.
  motivo: string | null
  // Lo que el diseño de la hoja no muestra y publicar va a pedir (C6).
  avisoDelDiseno: string | null
  recargando: boolean
  alGuardar: () => void
  alRecargar: () => void
}

const AVISO =
  'rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)'

// El texto de un error que no es un conflicto: propio, nunca el de la base.
function textoDelError(estado: EstadoDelGuardado, nombreDelOrigen: string): string | null {
  switch (estado.tipo) {
    case 'regla':
      return MENSAJE_DE_REGLA
    case 'sin_permiso':
      return `Ya no configuras ${nombreDelOrigen}: no se puede guardar.`
    case 'sin_respuesta':
      return MENSAJE_SIN_RESPUESTA
    case 'error':
      return MENSAJE_DE_ERROR
    case 'quieto':
    case 'entro':
    case 'conflicto':
      return null
    default: {
      const _: never = estado
      return _
    }
  }
}

// La línea de estado junto al botón: nada mientras guarda; tras guardar y sin cambios, «Se guardó el borrador.»; si no, por qué espera.
function lineaDe(estado: EstadoDelGuardado, motivo: string | null, enCurso: boolean): string {
  if (enCurso) return ''
  if (estado.tipo === 'entro' && motivo === SIN_CAMBIOS) return SE_GUARDO
  return motivo ?? ''
}

// «Guardar el borrador» del editor (4.21-3b-1, C5 a C7): el botón con la línea de por qué espera o de lo que pasó (en la barra de la fórmula; en la puesta en
// marcha, arriba de la planilla) y, arriba de la planilla, el conflicto con «Recargar» y el aviso de lo que el diseño no muestra. Tras guardar y sin cambios, «Se guardó el borrador.» ocupa el lugar de «No hay cambios por guardar.».
export function GuardarBorrador(props: Props) {
  const { estado, motivo, enCurso } = props
  const conflicto = estado.tipo === 'conflicto' ? estado.mensaje : null
  const error = textoDelError(estado, props.nombreDelOrigen)
  const linea = lineaDe(estado, motivo, enCurso)
  return (
    <div className="grid min-w-0 gap-2 empty:hidden">
      {/* En la página del origen el botón y su línea van a la barra de la fórmula (la línea, chica, antes del botón y en hasta dos renglones: el motivo más largo entra entero); los avisos quedan acá. */}
      <AccionesEnLaBarra orden={1}>
        <div data-guardado className="flex min-w-0 items-center gap-2">
          <p
            role="status"
            title={linea || undefined}
            className="line-clamp-2 max-w-48 min-w-0 text-(length:--text-xs) text-(--color-ink-soft) sm:max-w-64"
          >
            {linea}
          </p>
          <Button
            type="button"
            className="min-h-11 shrink-0 md:min-h-9"
            disabled={motivo !== null || enCurso || conflicto !== null}
            onClick={props.alGuardar}
          >
            {enCurso ? 'Guardando…' : 'Guardar el borrador'}
          </Button>
        </div>
      </AccionesEnLaBarra>
      {conflicto !== null ? (
        <div role="alert" className={`grid gap-2 ${AVISO}`}>
          <p>{conflicto}</p>
          <p>Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se pierde.</p>
          <div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 md:min-h-9"
              disabled={props.recargando}
              onClick={props.alRecargar}
            >
              {props.recargando ? 'Recargando…' : 'Recargar'}
            </Button>
          </div>
        </div>
      ) : null}
      {error !== null ? (
        <p role="alert" className={AVISO}>
          {error}
        </p>
      ) : null}
      {props.avisoDelDiseno !== null ? <p className={AVISO}>{props.avisoDelDiseno}</p> : null}
    </div>
  )
}
