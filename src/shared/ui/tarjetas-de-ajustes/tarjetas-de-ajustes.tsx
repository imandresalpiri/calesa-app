import type { ReactNode } from 'react'

type Props = {
  // Qué reúnen las tarjetas: «Ajustes de la empresa». Es el nombre del grupo para el lector de pantalla.
  etiqueta: string
  children: ReactNode
}

// El tablero de una página de ajustes: las tarjetas en mampostería, sin huecos y sin JavaScript (columnas CSS). Cuántas columnas son lo
// decide el ancho del contenedor (`@container/ajustes`), no el de la pantalla: el menú de Configuración le quita ancho a la página. Una
// columna en el celular y con el texto al 200 % (la consulta va en `rem`, y ahí el `rem` crece).
// El orden de lectura y el de Tab es el del DOM, columna por columna: lo importante va primero.
export function TarjetasDeAjustes({ etiqueta, children }: Props) {
  return (
    <div role="group" aria-label={etiqueta} className="@container/ajustes min-w-0">
      <div className="columns-[20rem] gap-4">{children}</div>
    </div>
  )
}
