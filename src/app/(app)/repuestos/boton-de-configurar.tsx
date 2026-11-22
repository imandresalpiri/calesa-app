import type { Route } from 'next'
import Link from 'next/link'
import { SettingsIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El ⚙ «Configurar» de `/repuestos`: el enlace a Repuestos › Configuración (flujo, cotizador y catálogos), en la fila de filtros junto a las acciones de la página, en las tres vistas
// (proyectos, cadena y stock). Lo dibuja la página sólo con `repuestos.configurar`. Es un enlace del servidor, sin JS propio; con el nombre «Configurar los repuestos», de 44 px en el celular
// (sólo el ícono, para que la fila no desborde en 375 px) y con su texto desde 768 px.
export function BotonDeConfigurar() {
  return (
    <Link
      href={RUTAS.configuracionDeRepuestos as Route}
      aria-label="Configurar los repuestos"
      className={buttonVariants({
        variant: 'outline',
        className: 'h-11 w-11 px-0 md:h-9 md:w-auto md:px-3',
      })}
    >
      <SettingsIcon aria-hidden />
      <span className="hidden md:inline">Configurar</span>
    </Link>
  )
}
