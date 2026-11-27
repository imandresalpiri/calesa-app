'use client'

import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react'
import { Input } from '@base-ui/react/input'
import { ENTRADA_CHICA, ENTRADA_GRANDE, type Lugar } from './clases'

export type TeclaDeCierre = 'enter' | 'tab' | 'esc'

type Props = {
  texto: string
  // Cómo queda el texto al abrir: todo seleccionado (se abrió con Enter, F2 o un clic) o el cursor al final (se abrió tipeando).
  seleccion: 'todo' | 'final'
  nombre: string
  describedby: string | undefined
  invalido: boolean
  alEscribir: (texto: string) => void
  alCerrar: (tecla: TeclaDeCierre, evento: KeyboardEvent<HTMLInputElement>) => void
  alPerderElFoco: () => void
  // El ancho del botón que reemplaza (en px); nulo si no se midió.
  ancho: number | null
  // La letra del botón que reemplaza.
  grande: boolean
  // El lugar en la rejilla de la celda del botón que reemplaza (`data-lugar`).
  lugar: Lugar
}

// Estable a propósito: React sólo la llama al montar la entrada. Una función nueva por render la volvería a llamar con cada tecla y
// devolvería el cursor al final (o seleccionaría todo) a mitad de lo que se tipea.
function alMontar(elemento: HTMLElement | null) {
  if (!(elemento instanceof HTMLInputElement)) {
    return
  }
  elemento.focus()
  if (elemento.dataset['seleccion'] === 'todo') {
    elemento.select()
  } else {
    elemento.setSelectionRange(elemento.value.length, elemento.value.length)
  }
}

// La entrada que reemplaza al botón del valor. Siempre texto, con el Modo Live también: lo tipeado es el número sin símbolo
// (`formatearParaEditar`), y encender el modo a mitad de una edición no cambia nada acá: ni el foco ni lo tipeado. `Enter`, `Esc` y `Tab` los resuelve la celda: acá sólo se avisa cuál fue.
export function EntradaDeXCell(props: Props) {
  const { texto, seleccion, nombre, describedby, invalido, alEscribir, alCerrar, alPerderElFoco } =
    props
  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter') {
      // Sin esto el `keypress` de este Enter cae en el botón que ocupa su lugar y vuelve a abrir la edición.
      evento.preventDefault()
      alCerrar('enter', evento)
    } else if (evento.key === 'Escape') {
      // Esc cancela la celda y no cierra el modal o el panel que la contiene.
      evento.preventDefault()
      evento.stopPropagation()
      alCerrar('esc', evento)
    } else if (evento.key === 'Tab') {
      // Sin `preventDefault`: Tab sigue su camino a la celda que viene. La celda lo frena sólo si lo escrito no es un número.
      alCerrar('tab', evento)
    }
  }

  return (
    <Input
      ref={alMontar}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={nombre}
      aria-invalid={invalido || undefined}
      aria-describedby={describedby}
      data-seleccion={seleccion}
      data-lugar={props.lugar}
      className={props.grande ? ENTRADA_GRANDE : ENTRADA_CHICA}
      style={props.ancho === null ? undefined : { width: props.ancho }}
      value={texto}
      onChange={(evento: ChangeEvent<HTMLInputElement>) => {
        alEscribir(evento.target.value)
      }}
      onKeyDown={alTeclear}
      onBlur={(_: FocusEvent<HTMLInputElement>) => {
        alPerderElFoco()
      }}
    />
  )
}
