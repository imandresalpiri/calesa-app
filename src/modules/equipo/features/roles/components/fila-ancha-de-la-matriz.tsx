import type { ReactNode } from 'react'
import { cn } from 'cn'
import { TableCell, TableRow } from '@/shared/ui/table'

type Props = {
  // Cuántas columnas de rol tiene la tabla (la de «Permiso» se suma).
  columnas: number
  children: ReactNode
  className?: string
}

// Una fila que abarca toda la tabla pero se lee en lo que se ve de la tarjeta: con ocho roles la tabla mide 4.000 px y se desplaza de costado, así que
// el contenido va `sticky left-0` con el ancho del contenedor de la tabla (`@container/roles`, `100cqw`) y no se va con el desplazamiento.
export function FilaAnchaDeLaMatriz({ columnas, children, className }: Props) {
  return (
    <TableRow className={cn('hover:bg-transparent', className)}>
      <TableCell colSpan={columnas + 1} className="p-0 whitespace-normal">
        <div className="sticky left-0 w-[100cqw]">{children}</div>
      </TableCell>
    </TableRow>
  )
}
