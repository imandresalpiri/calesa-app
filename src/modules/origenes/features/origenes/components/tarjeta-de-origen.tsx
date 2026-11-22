'use client'

import { CircleCheckIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { rutaDelOrigen } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { contados } from '../../../entities/nombre'
import { ETIQUETA_DE_TIPO_DE_ORIGEN, type OrigenConUso } from '../../../entities/origen'
import type { ClaveDePaso, EstadoDePaso } from '../../../entities/pasos'
import { IconoDelPaso } from '../../pasos/components/icono-del-paso'

type Props = {
  origen: OrigenConUso
  // Lo que le falta, en corto y con su estado (`faltasDeLaTarjeta()`): vacío = nada pendiente.
  faltas: readonly { clave: ClaveDePaso; estado: EstadoDePaso; texto: string }[]
  // Las líneas de su «⋯» (`accionesDeLaTarjeta()`): «Abrir» primero.
  acciones: readonly AccionDeMenu[]
}

// Un origen en la lista: dice su tipo, si está activo, lo que le falta para funcionar y lo que lo ata. Tocarla lleva a su página (la pestaña Datos, que abre
// quien ve el origen en la lista): un enlace con nombre «Abrir <origen>» que la cubre, y su «⋯» (la lista única de sus acciones) va encima, como hermano: nada
// interactivo dentro de otro. No es la «tarjeta de la lista» del patrón `ui/lista`: abrirla es entrar al origen, no abrir un resumen.
export function TarjetaDeOrigen({ origen, faltas, acciones }: Props) {
  return (
    <li className="min-w-0">
      <div className="relative grid h-full content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 hover:border-(--color-line-strong) hover:bg-(--color-surface-3) has-[a:focus-visible]:shadow-(--shadow-focus)">
        <Link
          href={rutaDelOrigen(origen.id) as Route}
          aria-label={`Abrir ${origen.nombre}`}
          className="absolute inset-0 rounded-(--radius-card) outline-none"
        />
        <span className="grid gap-2">
          <span className="flex min-w-0 items-center gap-2 pe-10">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: origen.color }}
            />
            <span className="min-w-0 truncate text-(length:--text-base) font-medium text-(--color-ink)">
              {origen.nombre}
            </span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}</Badge>
            {origen.activo ? (
              <Badge className="bg-(--color-positivo-soft) text-(--color-positivo-ink)">
                Activo
              </Badge>
            ) : (
              <Badge variant="outline">Inactivo</Badge>
            )}
          </span>
        </span>
        {faltas.length > 0 ? (
          <span className="grid gap-1">
            {faltas.map((falta) => (
              <span
                key={falta.clave}
                className="flex items-start gap-1.5 text-(length:--text-sm) text-(--color-ink)"
              >
                <IconoDelPaso estado={falta.estado} />
                {falta.texto}
              </span>
            ))}
          </span>
        ) : origen.activo ? (
          <span className="flex items-center gap-1.5 text-(length:--text-sm) text-(--color-positivo-ink)">
            <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
            Nada pendiente
          </span>
        ) : null}
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {contados(origen.uso.vehiculos, origen.sustantivo)} ·{' '}
          {contados(origen.uso.cotizaciones, 'cotización')}
        </span>
        <span className="absolute top-1 right-1">
          <MasAcciones nombre={origen.nombre} acciones={acciones} />
        </span>
      </div>
    </li>
  )
}
