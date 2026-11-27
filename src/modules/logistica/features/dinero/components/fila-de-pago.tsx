'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, MasAcciones, TarjetaDeLista, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { AccionesDelPago } from '../../../entities/dinero/acciones-del-pago'
import { textoDelSello, type Pago } from '../../../entities/dinero/pago'
import { verComprobante } from './ver-comprobante'

type Props = {
  pago: Pago
  // Lo decide `accionesDelPago`: un confirmado nunca ofrece editar ni eliminar.
  acciones: AccionesDelPago
  // Abre el panel del pago: su formulario o, si no se puede editar, su lectura.
  alEditar: () => void
  alEliminar: () => void
  alConfirmar: () => void
  alAnular: () => void
}

// El orden del «⋯»: lo que hace avanzar el pago, lo que lo cambia, mirarlo y, al final, lo destructivo.
function accionesDeMenu({
  pago,
  acciones,
  alEditar,
  alEliminar,
  alConfirmar,
  alAnular,
}: Props): AccionDeMenu[] {
  const menu: AccionDeMenu[] = []
  if (acciones.confirmar) {
    menu.push({
      tipo: 'accion',
      clave: 'confirmar',
      etiqueta: 'Confirmar pago',
      alElegir: alConfirmar,
      despuesDeCerrar: true,
    })
  }
  if (acciones.editar) {
    menu.push({
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      alElegir: alEditar,
      despuesDeCerrar: true,
    })
  }
  const ruta = pago.comprobanteRuta
  if (ruta) {
    menu.push({
      tipo: 'accion',
      clave: 'ver-comprobante',
      etiqueta: 'Ver comprobante',
      alElegir: () => void verComprobante(ruta),
    })
  }
  if (acciones.eliminar) {
    menu.push({
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      alElegir: alEliminar,
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  if (acciones.anular) {
    menu.push({
      tipo: 'accion',
      clave: 'anular',
      etiqueta: 'Anular pago',
      alElegir: alAnular,
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  return menu
}

// Un pago de la unidad: concepto, fecha, método, el monto en su moneda y, si no es la base, el equivalente que guardó la base (`monto_base`: acá nunca se calcula). Sin confirmar dice
// «Sin confirmar» y, con la clave, su «⋯» ofrece «Confirmar pago» (toda acción va ahí: ningún botón suelto); confirmado muestra el sello (quién y cuándo) y ningún control de edición. Tocarla abre su panel, también sin permiso de editar y con el pago confirmado (en lectura).
export function FilaDePago(props: Props) {
  const { pago, alEditar } = props
  const { monedaBase, zonaHoraria } = useRegional()
  const menu = accionesDeMenu(props)
  const nombre = `pago ${pago.concepto}`
  const sello = textoDelSello(pago, zonaHoraria)
  return (
    <TarjetaDeLista
      alAbrir={alEditar}
      acciones={
        menu.length > 0 ? (
          <MasAcciones nombre={nombre} acciones={menu} id={`pago-${pago.id}-mas`} />
        ) : null
      }
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <AbrirResumen nombre={nombre} className="min-w-0 font-medium break-words">
          {pago.concepto}
        </AbrirResumen>
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {formatearFecha(pago.fecha, { zona: zonaHoraria })}
        </span>
      </div>
      {pago.metodo ? (
        <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
          {pago.metodo}
        </p>
      ) : null}
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
        <Monto valor={pago.monto} moneda={pago.moneda} className="font-medium" />
        {pago.moneda !== monedaBase ? (
          <span className="text-(--color-ink-soft)">
            Equivale a <Monto valor={pago.montoBase} />
          </span>
        ) : null}
      </p>
      <p
        className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)"
        data-sello={sello === null ? 'sin-confirmar' : 'confirmado'}
      >
        {sello ?? 'Sin confirmar'}
      </p>
    </TarjetaDeLista>
  )
}
