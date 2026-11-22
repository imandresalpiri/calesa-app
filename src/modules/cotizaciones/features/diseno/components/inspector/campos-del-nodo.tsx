'use client'

import { useState } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { MAXIMO_DEL_ROTULO } from '../../../../entities/diseno/edicion-de-nodos'
import { formatoDe, FORMATOS, type Formato, type Nodo } from '../../../../entities/nodos'

export const ETIQUETAS_DEL_FORMATO: Record<Formato, string> = {
  usd: 'Monto en dólares',
  moneda: 'Monto en la moneda de la empresa',
  pct: 'Porcentaje',
  raw: 'Número',
}

export const ROTULO_VACIO = 'El rótulo no puede quedar vacío.'
export const ROTULO_DE_LA_FORMULA =
  'Es el de la fila en la fórmula: cambia también en la planilla al guardar.'

type Props = {
  nodo: Nodo
  // Sólo las piezas que muestran un valor (celda, franja de subtotal) eligen formato.
  conFormato: boolean
  ocupado: boolean
  alPonerEtiqueta: (texto: string) => void
  alPonerFormato: (formato: Formato) => void
}

// El rótulo y el formato de la fila que dibuja la pieza: son de la fórmula y se guardan con el borrador. El rótulo se escribe aquí y se aplica al salir del campo o
// con Enter (vacío vuelve al de antes); quien lo monta le da una `key` con el rótulo, así lo que llega de afuera (Deshacer, Recargar) lo reemplaza.
export function CamposDelNodo({
  nodo,
  conFormato,
  ocupado,
  alPonerEtiqueta,
  alPonerFormato,
}: Props) {
  const [texto, setTexto] = useState(nodo.etiqueta)
  const vacio = texto.trim() === ''
  const aplicar = () => {
    if (vacio) setTexto(nodo.etiqueta)
    else if (texto.trim() !== nodo.etiqueta) alPonerEtiqueta(texto)
  }
  return (
    <div className="grid min-w-0 gap-2">
      <Campo
        nombre={`rotulo-${nodo.id}`}
        etiqueta="Rótulo"
        value={texto}
        maxLength={MAXIMO_DEL_ROTULO}
        disabled={ocupado}
        ayuda={ROTULO_DE_LA_FORMULA}
        {...(vacio ? { error: ROTULO_VACIO } : {})}
        onChange={(evento) => {
          setTexto(evento.target.value)
        }}
        onBlur={aplicar}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            aplicar()
          }
        }}
      />
      {conFormato ? (
        <CampoSeleccion
          nombre={`formato-${nodo.id}`}
          etiqueta="Formato"
          opciones={FORMATOS.map((valor) => ({ valor, etiqueta: ETIQUETAS_DEL_FORMATO[valor] }))}
          value={formatoDe(nodo)}
          disabled={ocupado}
          onChange={(evento) => {
            alPonerFormato(evento.target.value as Formato)
          }}
        />
      ) : null}
    </div>
  )
}
