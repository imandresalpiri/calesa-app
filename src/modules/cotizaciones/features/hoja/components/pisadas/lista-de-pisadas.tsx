'use client'

import type { ContextoDeHoja } from '../../../../entities/binding'
import { pisadasDeLaHoja } from '../../../../entities/pisadas-de-la-hoja'
import { ValorDeNodo } from '../valor-de-nodo'

// Lo pisado en el resumen, una línea por celda: «Editado a mano: Transferencia a USA $500, calculado $480» (el dinero por `<Monto>`). Sin la respuesta que lo
// calculó, la línea no dice lo calculado: nunca una cifra vieja.
export function ListaDePisadas({ contexto }: { contexto: ContextoDeHoja }) {
  const pisadas = pisadasDeLaHoja(contexto)
  if (pisadas.length === 0) {
    return null
  }
  return (
    <ul data-pisadas="" className="grid gap-1 text-(length:--text-sm) text-(--color-ink-soft)">
      {pisadas.map((p) => (
        <li key={p.nodo} className="[overflow-wrap:anywhere]">
          Editado a mano: {p.etiqueta}{' '}
          <ValorDeNodo valor={p.valor} formato={p.formato} decimales={p.decimales} />
          {p.calculado === undefined ? null : (
            <>
              , calculado{' '}
              <ValorDeNodo valor={p.calculado} formato={p.formato} decimales={p.decimales} />
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
