import type { ReactNode } from 'react'
import { PestanasDeLaConfiguracion } from './pestanas-de-la-configuracion'

// Repuestos › Configuración: el título y la tira de pestañas (Flujo, Cotizador y Catálogos, cada una su sub-ruta). Un layout no protege a su página: cada pestaña comprueba sola
// `repuestos.configurar`. Va dentro del layout de `(app)`; sin tope de ancho. La tira no lee sesión: no espera a nada.
export default function LayoutDeLaConfiguracionDeRepuestos({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
        Configuración de repuestos
      </h1>
      <PestanasDeLaConfiguracion />
      {children}
    </div>
  )
}
