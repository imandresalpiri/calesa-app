'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { PanelesDePago } from '../hooks/use-paneles-de-pago'
import { ConfirmarEliminarPago } from './confirmar-eliminar-pago'
import { ConfirmarPago } from './confirmar-pago'
import { DrawerDeAnulacion } from './drawer-de-anulacion'
import { ModalDePagoDiferido } from './diferidos-de-dinero'

// Los cuatro paneles del hueco «Pagos»: el modal corto del pago (diferido, montado al abrirse por primera vez), «Confirmar pago», «Eliminar» y «Anular pago». Cada uno vive en su URL (`?panel=…&pago=<id>`) y sólo abre si el estado del pago y el
// permiso lo dejan.
export function DialogosDePago({
  unidadId,
  paneles: p,
  permisos,
}: {
  unidadId: string
  paneles: PanelesDePago
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean }
}) {
  const montado = useAbiertoAlgunaVez(p.formulario.abierto)
  return (
    <>
      {montado ? (
        <ModalDePagoDiferido
          // Cada apertura nace de nuevo (otro intento, los campos de lo guardado) y el cierre se va con su animación.
          key={p.formulario.apertura}
          abierto={p.formulario.abierto}
          alCerrar={p.formulario.cerrar}
          unidadId={unidadId}
          original={p.formulario.original}
          perdido={p.formulario.perdido}
          permisos={permisos}
          alAnular={() => {
            if (p.formulario.original) {
              p.abrirAnular(p.formulario.original.id)
            }
          }}
        />
      ) : null}
      <ConfirmarPago
        abierto={p.confirmar.abierto}
        pago={p.confirmar.pago}
        alCerrar={p.confirmar.cerrar}
        confirmar={p.confirmarElPago}
      />
      <ConfirmarEliminarPago
        abierto={p.eliminar.abierto}
        pago={p.eliminar.pago}
        alCerrar={p.eliminar.cerrar}
        eliminar={p.eliminarElPago}
      />
      <DrawerDeAnulacion
        abierto={p.anular.abierto}
        alCerrar={p.anular.cerrar}
        unidadId={unidadId}
        pago={p.anular.pago}
        apertura={p.anular.apertura}
      />
    </>
  )
}
