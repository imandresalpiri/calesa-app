'use client'

import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { fraseDeActividad } from '../../../entities/frase'
import { FraseDeActividad } from '../../frase/components/frase-de-actividad'
import { useDiff, type LecturaDelDiff } from '../hooks/use-diff'
import { CuerpoDelCambio } from './cuerpo-del-cambio'

type Props = {
  id: number | null
  // Con la frase y la fecha arriba: el drawer no muestra la fila.
  conCabecera?: boolean
}

// Quién hizo qué y cuándo, leído del diff (sin título del registro: el diff no lo trae).
function Cabecera({ lectura }: { lectura: LecturaDelDiff }) {
  const { zonaHoraria } = useRegional()
  if (lectura.estado !== 'listo' || !lectura.diff.visible) {
    return null
  }
  const diff = lectura.diff
  const frase = fraseDeActividad({
    ...diff,
    visible: true,
    campos: [],
    masCampos: false,
    registroTitulo: null,
    registroDestino: null,
    primerCambio: null,
  })
  return (
    <div className="grid gap-0.5">
      <FraseDeActividad frase={frase} zona={zonaHoraria} />
      <time
        dateTime={diff.creadoEn}
        className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
      >
        {formatearFecha(diff.creadoEn, { zona: zonaHoraria })}{' '}
        {formatearHora(diff.creadoEn, { zona: zonaHoraria })}
      </time>
    </div>
  )
}

// El detalle de un cambio, leído al montarse (`actividad_diff`): lo que muestra el drawer «Detalle del cambio». `id` nulo (un
// `?cambio=` que no es un id): sin acceso, sin leer nada.
export function DetalleDelCambio({ id, conCabecera }: Props) {
  const { lectura, reintentar } = useDiff(true, id)
  return (
    <div className="grid gap-3">
      {conCabecera ? <Cabecera lectura={lectura} /> : null}
      <CuerpoDelCambio lectura={lectura} reintentar={reintentar} />
    </div>
  )
}
