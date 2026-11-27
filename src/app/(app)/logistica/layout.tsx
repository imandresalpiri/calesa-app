import type { ReactNode } from 'react'

// Logística (6.01): cada página dibuja arriba su barra (`BarraDeLogistica`: los orígenes y las pestañas del elegido) y, debajo, su contenido. El layout no lleva
// la barra: no recibe `?origen=` ni se vuelve a dibujar al navegar entre páginas hermanas.
export default function LayoutDeLogistica({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}
