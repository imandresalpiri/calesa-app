'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

// Mientras llega la tabla de un bloque: unas filas grises, con letrero para quien lee en voz alta. Los demás bloques ya se ven.
export function LeyendoLaTabla() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, ESPERA_DEL_ESQUELETO_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando la tabla" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </>
      ) : null}
    </div>
  )
}

// El fallo sigue al del recálculo: «Recargar» si lo que falló no se arregla volviendo a pedir (la fórmula cambió, la sesión venció o ya no hay permiso), si no «Reintentar». Sin
// permiso, la tabla ya no es de esta hoja (se desactivó, o dejó de verse): sin cifras.
export function FalloDeLaTabla({
  recargar,
  sinPermiso,
  alReintentar,
}: {
  recargar: boolean
  sinPermiso: boolean
  alReintentar: () => void
}) {
  const router = useRouter()
  return (
    <div role="alert" className="grid gap-3">
      <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
        {sinPermiso ? 'Esta tabla ya no está disponible.' : 'No se pudo leer la tabla.'}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit md:min-h-8"
        onClick={recargar ? router.refresh : alReintentar}
      >
        {recargar ? 'Recargar' : 'Reintentar'}
      </Button>
    </div>
  )
}
