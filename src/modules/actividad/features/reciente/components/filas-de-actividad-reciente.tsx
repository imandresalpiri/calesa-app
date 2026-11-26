import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { CLAVE_DE_CAMBIO, type FilaDeActividad } from '../../../entities/actividad'
import { rutaDeActividadDe } from '../../../entities/filtros'
import { fraseDeActividad } from '../../../entities/frase'
import { FraseDeActividad } from '../../frase/components/frase-de-actividad'
import { IconoDeEntidad } from '../../frase/components/icono-de-entidad'

type Props = {
  tabla: string
  registroId: string
  // Ya cortadas a `TAMANO_DE_ACTIVIDAD_RECIENTE` y con al menos una.
  filas: readonly FilaDeActividad[]
  zona: string
}

// Las filas de la «Actividad reciente»: cada cambio como frase, enlazado a ese cambio abierto en `/actividad`. Sin hooks: las dibujan la pieza
// del servidor (`/actividad/reciente`) y la isla que lee al acercarse (la ficha del vehículo).
export function FilasDeActividadReciente({ tabla, registroId, filas, zona }: Props) {
  const base = rutaDeActividadDe(tabla, registroId)
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      {filas.map((fila) => {
        // El registro es el de la ficha: la frase no lo enlaza (toda la fila lleva al cambio en `/actividad`).
        const frase = fraseDeActividad(fila)
        const sinEnlace = { ...frase, registro: { ...frase.registro, enlace: null } }
        return (
          <li key={fila.id} className="min-w-0">
            <Link
              href={`${base}&${CLAVE_DE_CAMBIO}=${String(fila.id)}` as Route}
              className="flex min-w-0 items-start gap-3 px-3 py-2.5 outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus)"
            >
              <IconoDeEntidad icono={frase.icono} />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <FraseDeActividad frase={sinEnlace} zona={zona} />
                <time
                  dateTime={fila.creadoEn}
                  className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
                >
                  {formatearFecha(fila.creadoEn, { zona })} {formatearHora(fila.creadoEn, { zona })}
                </time>
              </div>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

// Sin cambios en la ventana que guarda la empresa.
export function SinCambiosRecientes({ diasDeActividad }: { diasDeActividad: number }) {
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      Sin cambios en los últimos {diasDeActividad} días.
    </p>
  )
}
