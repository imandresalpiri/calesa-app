import { NOTA } from './clases'
import type { Nota } from './estado'
import { IconoDeXCell, ID_DEL_AVISO } from './simbolos-de-xcell'

type Props = { id: string; nota: Nota }

// El aviso de lo tipeado o el error de la base, siempre escrito bajo la celda (nunca sólo un color o un icono) y partido, no cortado. El motivo de un
// candado no va acá: es el nombre del candado de la fila de acciones (`CandadoDeXCell`).
export function NotaDeXCell({ id, nota }: Props) {
  return (
    <p id={id} className={NOTA} role="alert">
      <IconoDeXCell id={ID_DEL_AVISO} />
      {nota.texto}
    </p>
  )
}
