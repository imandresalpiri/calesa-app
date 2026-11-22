'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Lo que el layout de Configuración dibuja sólo dentro de una sección (la vuelta «‹ Configuración», el buscador de arriba del celular); el
// inicio ya es esa vuelta. El menú y el selector van en todas. Un layout no se vuelve a dibujar al pasar de una página a otra: se decide en
// el navegador con la ruta.
export function EnUnaSeccion({ inicio, children }: { inicio: string; children: ReactNode }) {
  return usePathname() === inicio ? null : children
}

// Un contenedor cuya clase depende de si se ve el inicio o una sección (para reservar o quitar su lugar sin que la página salte).
export function MarcoSegunLaRuta({
  inicio,
  claseEnElInicio,
  claseEnUnaSeccion,
  children,
}: {
  inicio: string
  claseEnElInicio: string
  claseEnUnaSeccion: string
  children?: ReactNode
}) {
  return (
    <div className={usePathname() === inicio ? claseEnElInicio : claseEnUnaSeccion}>{children}</div>
  )
}
