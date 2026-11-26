import { formatearNumero } from '@/shared/lib/formato'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

export type FilaDeTabla = { clave: string; etiqueta: string; a: number; b: number }

type Props = {
  titulo: string
  // La cabecera de la primera columna: «Día», «Origen» o «Persona».
  primera: string
  columnas: readonly [string, string]
  filas: readonly FilaDeTabla[]
}

// Los mismos números de la gráfica, todos, en una tabla: el cuerpo del modal «Ver como tabla» (`ver-como-tabla.tsx`). Sin estado: la dibuja
// el servidor y viaja como prop al botón. Hasta 90 días son 90 filas: desplaza el cuerpo del modal.
export function TablaEquivalente({ titulo, primera, columnas, filas }: Props) {
  return (
    <Table>
      <TableCaption className="sr-only">{titulo}: datos de la gráfica</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{primera}</TableHead>
          <TableHead scope="col" className="text-right">
            {columnas[0]}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {columnas[1]}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <TableRow key={fila.clave}>
            <TableCell>{fila.etiqueta}</TableCell>
            <TableCell className="text-right tabular-nums">{formatearNumero(fila.a)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatearNumero(fila.b)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
