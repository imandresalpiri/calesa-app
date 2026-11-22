'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { esLaPaginaDelOrigen } from './pagina-del-origen'

// Lo que el layout de Configuración no dibuja dentro de la página de un origen (el menú de la izquierda, la cabecera con el selector de sección y el buscador):
// ahí manda el camino de las migas y la página va a todo el ancho. Un layout no se vuelve a dibujar al pasar de una página a otra: se decide con la ruta.
export function FueraDeLaPaginaDelOrigen({ children }: { children: ReactNode }) {
  return esLaPaginaDelOrigen(usePathname()) ? null : children
}
