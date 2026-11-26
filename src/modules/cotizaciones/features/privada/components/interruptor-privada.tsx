'use client'

import { InterruptorChico } from '../../hoja/components/interruptor-chico'
import { AYUDA_DEL_INTERRUPTOR, ETIQUETA_DE_PRIVADA } from '../../../entities/privada'

// El interruptor «Privada» al guardar una nueva (glosario: «Cotización privada»), en la fila de pasos de la hoja (el lugar de «Hoja»): chico, en línea, con su nombre;
// a quién se la muestra va por `aria-describedby` y `title`. Apagado mientras guarda. Sólo lo dibuja la hoja nueva (`useMarcaDeLaNueva()`), que siempre es una preventa y
// la guarda quien la crea; una guardada la cambia por su «⋯».
export function InterruptorPrivada({
  privada,
  alCambiar,
  ocupado,
}: {
  privada: boolean
  alCambiar: (privada: boolean) => void
  ocupado: boolean
}) {
  return (
    <InterruptorChico
      etiqueta={ETIQUETA_DE_PRIVADA}
      ayuda={AYUDA_DEL_INTERRUPTOR}
      valor={privada}
      alCambiar={alCambiar}
      deshabilitado={ocupado}
      marca={{ 'data-interruptor-privada': '' }}
    />
  )
}
