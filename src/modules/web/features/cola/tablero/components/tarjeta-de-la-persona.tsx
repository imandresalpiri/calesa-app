'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { MasAcciones, TarjetaDeLista } from '@/shared/ui/lista'
import type { FilaDelTablero } from '../../../../entities/cola/tablero'
import { accionesDeLaPersona } from './acciones-de-la-persona'

type Props = {
  fila: FilaDelTablero
  // El puesto en el orden de la ruleta; sin él, la persona no está entre las elegibles.
  puesto?: number
  // Por qué hoy no recibe un turno nuevo, si no lo recibe.
  motivo?: string
  alEditar: (fila: FilaDelTablero) => void
  alQuitar: (fila: FilaDelTablero) => void
}

// Una persona habilitada en la cola, como tarjeta de la lista: lo que pesa en la ruleta (disponible, abiertas de su cupo, prioridad) y cómo le fue (tasa de
// contacto, vencidas, última asignación). Sólo lleva su «⋯» («Editar…», «Quitar de la rueda»); tocarla, fuera del «⋯», abre «Editar…». Con el teclado, el nombre
// es el botón «Editar <nombre>» y el «⋯» va aparte.
export function TarjetaDeLaPersona({ fila, puesto, motivo, alEditar, alQuitar }: Props) {
  const tasa =
    fila.tasaContactoPct === null
      ? 'Sin turnos aún'
      : `Contacta el ${formatearPorcentaje(fila.tasaContactoPct / 100)}`
  return (
    <TarjetaDeLista
      estirada
      alAbrir={() => {
        alEditar(fila)
      }}
      acciones={
        <MasAcciones
          nombre={fila.nombre}
          acciones={accionesDeLaPersona({
            alEditar: () => {
              alEditar(fila)
            },
            alQuitar: () => {
              alQuitar(fila)
            },
          })}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {puesto === undefined ? null : (
          <span className="text-(--color-ink-soft) tabular-nums">{formatearNumero(puesto)}.</span>
        )}
        <button
          type="button"
          data-abre-resumen=""
          aria-label={`Editar ${fila.nombre}`}
          title={fila.nombre}
          className="min-w-0 text-left font-medium break-words text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
        >
          {fila.nombre}
        </button>
        {fila.cuentaActiva ? (
          <Badge variant={fila.disponible ? 'secondary' : 'outline'}>
            {fila.disponible ? 'Disponible' : 'No disponible'}
          </Badge>
        ) : null}
        {/* En la rueda, el motivo ya lo dice. */}
        {fila.faltaWhatsapp && !motivo ? (
          <Badge variant="destructive">Le falta el WhatsApp</Badge>
        ) : null}
      </div>
      {motivo ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivo}</p> : null}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="tabular-nums">
          {formatearNumero(fila.abiertas)} de {formatearNumero(fila.cupo)} abiertas
          {fila.maxAbiertas === null ? ' (hereda la política)' : ''}
        </span>
        <span className="tabular-nums">Prioridad {formatearNumero(fila.prioridad)}</span>
        <span className="tabular-nums">{tasa}</span>
        <span className="tabular-nums">
          {formatearNumero(fila.vencidasTotal)} {fila.vencidasTotal === 1 ? 'vencida' : 'vencidas'}
        </span>
        <span>
          Último turno: {fila.ultimaAsignacionEn ? fechaRelativa(fila.ultimaAsignacionEn) : 'nunca'}
        </span>
      </p>
    </TarjetaDeLista>
  )
}
