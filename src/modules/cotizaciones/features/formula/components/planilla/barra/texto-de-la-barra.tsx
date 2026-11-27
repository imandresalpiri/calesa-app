'use client'

import { useLayoutEffect, useRef, type SyntheticEvent } from 'react'
import type { CeldaActiva } from '../../../hooks/use-cuadricula'
import type { Planilla } from '../../../hooks/use-planilla'
import { idsDeLaEdicion } from '../ids-de-la-edicion'
import { alTeclearEnLaEdicion } from '../teclas-de-la-edicion'
import { EditorConReferencias } from './editor-con-referencias'

// La única guía de la planilla: el texto de ejemplo de la barra vacía.
export const EJEMPLO_DE_LA_BARRA = 'Escribe = y toca las celdas: =C5+C7'

type Props = {
  planilla: Planilla
  celda: CeldaActiva
  // «C5, Remate».
  nombre: string
  // El texto de la celda activa sin nada escrito.
  texto: string
}

// Lo que el lector sabe del texto: el error, la lista de sugerencias y la elegida.
function ariaDelTexto(planilla: Planilla, enLaBarra: boolean) {
  const ids = idsDeLaEdicion(planilla.prefijo)
  const conLista = planilla.sugerencias.lista.length > 0
  const conError = (planilla.edicion.edicion?.error ?? null) !== null
  const describe = [conError ? ids.error : null, planilla.guia.firma ? ids.firma : null]
  return {
    'aria-invalid': conError ? true : undefined,
    'aria-describedby': describe.filter((id) => id !== null).join(' ') || undefined,
    'aria-autocomplete': 'list',
    'aria-controls': conLista ? ids.lista : undefined,
    'aria-activedescendant':
      conLista && enLaBarra ? ids.opcion(planilla.sugerencias.indice) : undefined,
  } as const
}

// El texto de la barra de fórmula: sin nada escrito muestra el de la celda activa y el primer cambio abre la edición en la barra; escribiendo (en la barra o en la
// celda) muestra lo mismo que la celda, con las mismas teclas (Shift+Enter, otra línea). Esc sin nada escrito vuelve a la grilla.
export function TextoDeLaBarra({ planilla, celda, nombre, texto }: Props) {
  const { edicion, sugerencias } = planilla
  const e = edicion.edicion
  const ids = idsDeLaEdicion(planilla.prefijo)
  const campo = useRef<HTMLTextAreaElement>(null)
  const enLaBarra = e?.en === 'barra'
  const cursor = e?.cursor ?? 0
  const ubicar = (ev: SyntheticEvent<HTMLTextAreaElement>) => {
    if (e !== null) edicion.ubicar(ev.currentTarget.selectionStart, 'barra')
  }
  useLayoutEffect(() => {
    const c = campo.current
    if (c === null || !enLaBarra || document.activeElement !== c) return
    if (c.selectionStart === c.selectionEnd && c.selectionStart !== cursor)
      c.setSelectionRange(cursor, cursor)
  }, [enLaBarra, cursor, e?.texto])
  return (
    <EditorConReferencias
      ref={campo}
      id={ids.texto}
      placeholder={EJEMPLO_DE_LA_BARRA}
      valor={e?.texto ?? texto}
      refs={planilla.refs}
      tramoDelError={e?.error?.tramo ?? null}
      aria-label={`Fórmula de ${nombre}`}
      {...ariaDelTexto(planilla, enLaBarra)}
      onChange={(ev) => {
        const { value, selectionStart } = ev.target
        if (e === null && !edicion.abrir(celda, { en: 'barra', tipeado: value })) return
        edicion.escribir(value, selectionStart)
      }}
      onSelect={ubicar}
      onFocus={ubicar}
      onKeyDown={(ev) => {
        if (e !== null) {
          alTeclearEnLaEdicion(ev, {
            sugerencias,
            aplicarYSeguir: planilla.aplicarYSeguir,
            descartar: planilla.descartar,
            siguienteLugar: planilla.edicion.siguienteLugar,
            enLaBarra: true,
          })
        } else if (ev.key === 'Escape') {
          ev.preventDefault()
          planilla.enfocar()
        }
      }}
    />
  )
}
