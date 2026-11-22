'use client'

import type { ReactNode } from 'react'
import { MasAcciones, TarjetaDeLista, AbrirResumen } from '@/shared/ui/lista'

type Props = {
  // De qué es la fila («el tramo 1 en USD»): «Editar el tramo 1 en USD» nombra lo que abre un toque y «Más acciones de el tramo 1 en USD», el «⋯».
  nombre: string
  alEditar: () => void
  children: ReactNode
}

// Un tramo o una caja de la configuración del cotizador: la fila es una tarjeta de la lista. Un toque la abre en su modal de «Editar» y con el teclado es un botón con nombre; su única acción
// va en el «⋯» de arriba a la derecha (sin botón «Editar» suelto). Sin tope de ancho.
export function FilaDeConfiguracion({ nombre, alEditar, children }: Props) {
  return (
    <TarjetaDeLista
      alAbrir={alEditar}
      acciones={
        <MasAcciones
          nombre={nombre}
          acciones={[
            {
              tipo: 'accion',
              clave: 'editar',
              etiqueta: 'Editar',
              despuesDeCerrar: true,
              alElegir: alEditar,
            },
          ]}
        />
      }
    >
      <AbrirResumen
        nombre={nombre}
        verbo="Editar"
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm)"
      >
        {children}
      </AbrirResumen>
    </TarjetaDeLista>
  )
}
