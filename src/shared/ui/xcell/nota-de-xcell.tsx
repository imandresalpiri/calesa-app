import { CALCULADO, NOTA } from './clases'
import type { FormatoDeXCell, Nota } from './estado'
import { IconoDeXCell, ID_DEL_AVISO } from './simbolos-de-xcell'
import { TextoDeValor } from './texto-de-valor'

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

type PropsDelCalculado = {
  id: string
  valor: number | null
  formato: FormatoDeXCell
  moneda: string | undefined
  decimales: number | undefined
}

// Lo que daría un cálculo pisado sin lo escrito, bajo la celda: «Calculado: $480». El dinero pasa por `<Monto>` (`TextoDeValor`: Modo Live); sin valor
// (le falta un dato), «Calculado: —». No es un aviso: sin `role=alert`.
export function CalculadoDeXCell({ id, valor, formato, moneda, decimales }: PropsDelCalculado) {
  return (
    <p id={id} className={CALCULADO}>
      Calculado:{' '}
      {valor === null ? (
        '—'
      ) : (
        <TextoDeValor valor={valor} formato={formato} moneda={moneda} decimales={decimales} />
      )}
    </p>
  )
}
