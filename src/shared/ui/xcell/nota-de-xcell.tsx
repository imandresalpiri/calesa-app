'use client'

import { useSyncExternalStore } from 'react'
import { useLive } from '../live'
import { useRegional } from '../regional'
import { CALCULADO, NOTA } from './clases'
import type { FormatoDeXCell, Nota } from './estado'
import { IconoDeXCell, ID_DEL_AVISO } from './simbolos-de-xcell'
import { TextoDeValor, textoPlanoDeValor } from './texto-de-valor'

type Props = { id: string; nota: Nota }

// El aviso de lo tipeado o el error de la base, siempre escrito (nunca sólo un color o un icono) en la línea de la nota, dentro de la celda: lo que no
// entra se corta con «…» y se lee entero en `title`, en el globo de la raíz al enfocar o tocar, y en la descripción para el lector. El motivo de un
// candado no va acá: es el nombre del candado de la fila de acciones (`CandadoDeXCell`). `data-nota` hace flotar el rótulo.
export function NotaDeXCell({ id, nota }: Props) {
  return (
    <p id={id} className={NOTA} role="alert" title={nota.texto} data-nota="">
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

const sinSuscripcion = () => () => undefined
const siempre = () => true
const nunca = () => false

// Lo que daría un cálculo pisado sin lo escrito, en la línea de la nota: «Calculado: $480». El dinero pasa por `<Monto>` (`TextoDeValor`: Modo Live); sin
// valor (le falta un dato), «Calculado: —». No es un aviso: sin `role=alert`. Lo que no entra en la línea se lee entero en `title`, que dice lo mismo que
// lo dibujado: con el Modo Live, el número sin su moneda como `<Monto>` (por eso lee `useLive()`; sólo lo llevan las celdas pisadas). En el servidor y al
// hidratar no se sabe si el modo está encendido: el `title` va sin moneda hasta hidratar (un atributo no lo alcanza el CSS del modo).
export function CalculadoDeXCell({ id, valor, formato, moneda, decimales }: PropsDelCalculado) {
  const regional = useRegional()
  const { live } = useLive()
  const hidratado = useSyncExternalStore(sinSuscripcion, siempre, nunca)
  const texto =
    valor === null
      ? '—'
      : textoPlanoDeValor({ valor, formato, moneda, decimales }, regional, live || !hidratado)
  return (
    <p id={id} className={CALCULADO} title={`Calculado: ${texto}`} data-nota="">
      Calculado:{' '}
      {valor === null ? (
        '—'
      ) : (
        <TextoDeValor valor={valor} formato={formato} moneda={moneda} decimales={decimales} />
      )}
    </p>
  )
}
