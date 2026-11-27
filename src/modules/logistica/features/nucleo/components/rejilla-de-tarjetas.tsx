import type { ReactNode } from 'react'

// Las tarjetas de la unidad en su orden (`ORDEN_DE_TARJETAS`): dos columnas desde 40 rem de contenedor, una por debajo. Cada tarjeta tiene alto fijo, así que la rejilla
// no cambia de tamaño cuando llegan los resúmenes. Compatible con servidor.
export function RejillaDeTarjetas({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 @min-[40rem]/unidad:grid-cols-2">
      {children}
    </div>
  )
}
