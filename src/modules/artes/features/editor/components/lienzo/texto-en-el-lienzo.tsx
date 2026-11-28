'use client'

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CapaDe } from '../../../../entities/documento'
import { aPantalla, type Camara } from '../../../../entities/editor/camara'
import { ALINEACION_EN_EL_LIENZO } from '../../../../entities/editor/dibujo'

// El tope de `texto` en el esquema de la capa (`capas-del-documento.ts`).
const LARGO_MAXIMO_DEL_TEXTO = 5000

type Props = {
  capa: CapaDe<'texto'>
  camara: Camara
  familia: string
  // Lo escrito, una sola vez: al salir del campo, con Esc o con Ctrl+Enter (⌘+Enter).
  alTerminar: (texto: string) => void
}

// Un campo encima del texto del lienzo, con su letra, tamaño (por la escala), peso, interlineado, alineación, color y giro, para escribirlo
// en el lugar (con sus variables `{clave}` a la vista). Mientras tanto el texto de Konva no se dibuja.
export function TextoEnElLienzo({ capa, camara, familia, alTerminar }: Props) {
  const [valor, setValor] = useState(capa.texto)
  const campo = useRef<HTMLTextAreaElement>(null)
  const terminado = useRef(false)

  useEffect(() => {
    campo.current?.focus()
    campo.current?.select()
  }, [])

  useLayoutEffect(() => {
    const el = campo.current
    if (el) {
      el.style.height = '0px'
      el.style.height = `${String(el.scrollHeight)}px`
    }
  }, [valor, camara.escala, familia])

  const terminar = () => {
    if (!terminado.current) {
      terminado.current = true
      alTerminar(valor)
    }
  }

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const conCtrl = e.ctrlKey || e.metaKey
    if (e.key === 'Escape' || (e.key === 'Enter' && conCtrl)) {
      e.preventDefault()
      e.stopPropagation()
      terminar()
    }
  }

  const centro = aPantalla(camara, { x: capa.x + capa.ancho / 2, y: capa.y + capa.alto / 2 })
  return (
    <textarea
      ref={campo}
      aria-label="Texto"
      value={valor}
      maxLength={LARGO_MAXIMO_DEL_TEXTO}
      spellCheck={false}
      onChange={(e) => {
        setValor(e.target.value)
      }}
      onKeyDown={alTeclear}
      onBlur={terminar}
      className="absolute z-10 m-0 block resize-none overflow-hidden border-0 bg-transparent p-0 break-words whitespace-pre-wrap outline outline-1 outline-(--color-primario)"
      style={{
        left: centro.x,
        top: centro.y,
        width: capa.ancho * camara.escala,
        transform: `translate(-50%, -50%) rotate(${String(capa.rotacion)}deg)`,
        fontFamily: familia,
        fontSize: capa.tamano * camara.escala,
        fontWeight: capa.peso,
        lineHeight: capa.interlineado,
        textAlign: ALINEACION_EN_EL_LIENZO[capa.alineacion],
        color: capa.color,
        opacity: capa.opacidad,
      }}
    />
  )
}
