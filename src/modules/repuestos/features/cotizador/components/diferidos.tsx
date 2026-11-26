'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el código de un panel: unas líneas en su lugar.
function EsqueletoDelPanel() {
  return (
    <div role="status" aria-label="Cargando" className="grid gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

// «Agregar» y «Editar» de un tramo o de una caja se piden recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se montan con
// `useAbiertoAlgunaVez()`.
export const ModalDeTramoDiferido = diferido(() =>
  import('./modal-de-tramo').then((modulo) => modulo.ModalDeTramo),
)

export const ModalDeCajaDiferido = diferido(() =>
  import('./modal-de-caja').then((modulo) => modulo.ModalDeCaja),
)

// El panel «Cotizaciones» bajo los pasos de `/repuestos/[id]`: la lista se pide al elegirlo, no viaja con la hoja.
export const CotizacionesDelProyectoDiferido = diferido(
  () => import('./cotizaciones-del-proyecto').then((modulo) => modulo.CotizacionesDelProyecto),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)

// Las confirmaciones de «Aceptar» y «Anular» (`?panel=aceptar-cotizacion|anular-cotizacion`) se piden recién al abrirse, en la hoja y en la lista. Se montan
// con `useAbiertoAlgunaVez()`.
export const ConfirmarAceptarDiferido = diferido(
  () => import('./confirmar-aceptar').then((modulo) => modulo.ConfirmarAceptar),
  { aviso: 'pantalla' },
)

export const ConfirmarAnularDiferido = diferido(
  () => import('./confirmar-anular').then((modulo) => modulo.ConfirmarAnular),
  { aviso: 'pantalla' },
)
