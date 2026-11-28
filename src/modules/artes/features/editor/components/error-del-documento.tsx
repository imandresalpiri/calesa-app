'use client'

import { EstadoError } from '@/shared/ui/estados/estado-error'

// Recargar del todo (no `router.refresh()`): un documento guardado con una versión más nueva de la app se abre con el código nuevo.
const recargar = () => {
  window.location.reload()
}

// Un documento que esta versión no puede abrir (más nuevo o inválido), con su mensaje y «Reintentar».
export function ErrorDelDocumento({ mensaje }: { mensaje: string }) {
  return (
    <EstadoError
      titulo="No se pudo abrir el editor"
      descripcion={mensaje}
      alReintentar={recargar}
    />
  )
}
