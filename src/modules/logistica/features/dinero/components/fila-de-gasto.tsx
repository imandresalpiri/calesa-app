'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, MasAcciones, TarjetaDeLista, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { Gasto } from '../../../entities/dinero/gasto'
import { verComprobante } from './ver-comprobante'

type Props = {
  gasto: Gasto
  // Sin permiso de editar la fila no abre; su «⋯» sólo ofrece «Ver comprobante», si lo tiene.
  alEditar: (() => void) | null
  alEliminar: (() => void) | null
}

function accionesDe({ gasto, alEditar, alEliminar }: Props): AccionDeMenu[] {
  const acciones: AccionDeMenu[] = []
  if (alEditar) {
    acciones.push({
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      alElegir: alEditar,
      despuesDeCerrar: true,
    })
  }
  const ruta = gasto.comprobanteRuta
  if (ruta) {
    acciones.push({
      tipo: 'accion',
      clave: 'ver-comprobante',
      etiqueta: 'Ver comprobante',
      alElegir: () => void verComprobante(ruta),
    })
  }
  if (alEliminar) {
    acciones.push({
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      alElegir: alEliminar,
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  return acciones
}

// Un gasto de la unidad: categoría, proveedor, fecha, el monto en su moneda y, si no es la base, el equivalente que guardó la base (`monto_base`: acá nunca se calcula).
// Toda acción va en su «⋯» (Editar, Ver comprobante, Eliminar): ningún botón suelto.
export function FilaDeGasto(props: Props) {
  const { gasto, alEditar } = props
  const { monedaBase, zonaHoraria } = useRegional()
  const acciones = accionesDe(props)
  const nombre = `${gasto.categoriaNombre} del ${formatearFecha(gasto.fecha, { zona: zonaHoraria })}`
  return (
    <TarjetaDeLista
      alAbrir={alEditar ?? undefined}
      acciones={
        acciones.length > 0 ? (
          <MasAcciones
            nombre={`gasto de ${nombre}`}
            acciones={acciones}
            id={`gasto-${gasto.id}-mas`}
          />
        ) : null
      }
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {alEditar ? (
          <AbrirResumen nombre={`gasto de ${nombre}`} className="min-w-0 font-medium break-words">
            {gasto.categoriaNombre}
          </AbrirResumen>
        ) : (
          <span className="min-w-0 font-medium break-words">{gasto.categoriaNombre}</span>
        )}
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {formatearFecha(gasto.fecha, { zona: zonaHoraria })}
        </span>
      </div>
      {gasto.proveedor ? (
        <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
          {gasto.proveedor}
        </p>
      ) : null}
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
        <Monto valor={gasto.monto} moneda={gasto.moneda} className="font-medium" />
        {gasto.moneda !== monedaBase ? (
          <span className="text-(--color-ink-soft)">
            Equivale a <Monto valor={gasto.montoBase} />
          </span>
        ) : null}
      </p>
    </TarjetaDeLista>
  )
}
