import { CircleCheckIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { rutaDelOrigen } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { contados } from '../../../entities/nombre'
import { ETIQUETA_DE_TIPO_DE_ORIGEN, type OrigenConUso } from '../../../entities/origen'
import type { ClaveDePaso, EstadoDePaso } from '../../../entities/pasos'
import { IconoDelPaso } from '../../pasos/components/icono-del-paso'

type Props = {
  origen: OrigenConUso
  // Lo que le falta, en corto y con su estado (`faltasDeLaTarjeta()`): vacío = nada pendiente.
  faltas: readonly { clave: ClaveDePaso; estado: EstadoDePaso; texto: string }[]
}

// Un origen en la lista: entera es el enlace a su página (la pestaña Datos, que abre quien ve el origen en la lista). Dice su tipo, si está activo, lo que le falta para funcionar y lo que lo ata.
// No es la «tarjeta de la lista» del patrón `ui/lista` (no hay resumen ni «⋯»: abrirla es entrar al origen).
export function TarjetaDeOrigen({ origen, faltas }: Props) {
  return (
    <li className="min-w-0">
      <Link
        href={rutaDelOrigen(origen.id) as Route}
        className="grid h-full content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 outline-none hover:border-(--color-line-strong) hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
      >
        <span className="grid gap-2">
          <span className="flex min-w-0 items-center gap-2">
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
      </Link>
    </li>
  )
}
