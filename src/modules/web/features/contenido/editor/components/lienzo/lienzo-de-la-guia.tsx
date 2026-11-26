'use client'

import { EditorContent } from '@tiptap/react'
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import type { DocumentoDelSitio } from '../../../../../entities/contenido/documento-limpio'
import { useBloqueElegido } from '../../hooks/use-bloque-elegido'
import { useCajaDelBloque } from '../../hooks/use-caja-del-bloque'
import { useElegirBloque } from '../../hooks/use-elegir-bloque'
import { useMenuDeBloques } from '../../hooks/use-menu-de-bloques'
import { useEditorDelSitio } from '../../use-editor-del-sitio'
import { BarritaDelBloque } from './barrita-del-bloque'
import { InsertadorDeBloques } from './insertador-de-bloques'
import { MenuDeBloques } from './menu-de-bloques'
import { SelectorDeImagenes } from './selector-de-imagenes'

export type PropsDelLienzo = {
  valor: DocumentoDelSitio | null
  alCambiar: (documento: DocumentoDelSitio | null) => void
  deshabilitado: boolean
  // Abre la pestaña «Bloque» del panel (en una pantalla angosta, el cajón).
  alAbrirOpciones: () => void
  // El id de la etiqueta visible que nombra al texto.
  etiquetaId: string
  errorId?: string
  invalido: boolean
}

const CLASE_DEL_TEXTO =
  'documento-de-seguimiento documento-del-sitio min-h-64 text-(length:--text-base) text-(--color-ink) outline-none [&_blockquote]:border-s-4 [&_blockquote]:border-(--color-line) [&_blockquote]:ps-3 [&_blockquote]:text-(--color-ink-soft) [&_h2]:mt-4 [&_h2]:text-(length:--text-xl) [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-(length:--text-lg) [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-(--color-line) [&_.es-vacio]:pe-12 [&_.es-vacio]:before:pointer-events-none [&_.es-vacio]:before:float-left [&_.es-vacio]:before:h-0 [&_.es-vacio]:before:text-(--color-ink-soft) [&_.es-vacio]:before:content-[attr(data-vacio)]'

// Los atributos del cuadro de texto: su nombre, su error y el hueco del «+» en el párrafo vacío.
function atributosDelTexto(etiquetaId: string, errorId: string | undefined, invalido: boolean) {
  return {
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': etiquetaId,
    ...(errorId ? { 'aria-describedby': errorId } : {}),
    ...(invalido ? { 'aria-invalid': 'true' } : {}),
    class: CLASE_DEL_TEXTO,
  }
}

// El foco sigue en el lienzo si pasa a algo suyo (la barrita, el menú) o al panel de la guía (las opciones del bloque).
function sigueEnElEditor(evento: FocusEvent<HTMLDivElement>): boolean {
  const destino = evento.relatedTarget
  return (
    destino instanceof Element &&
    (evento.currentTarget.contains(destino) || destino.closest('[data-panel-de-la-guia]') !== null)
  )
}

// El cuerpo de la guía como un lienzo de bloques: el texto se escribe en su lugar; «/» y «+» eligen un bloque nuevo; la barrita flota sobre el elegido.
// Imagen y galería piden primero los archivos (el selector del sistema) y recién entonces se inserta el bloque.
export function LienzoDeLaGuia({
  valor,
  alCambiar,
  deshabilitado,
  alAbrirOpciones,
  etiquetaId,
  errorId,
  invalido,
}: PropsDelLienzo) {
  const idDelMenu = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)
  const editor = useEditorDelSitio({
    modo: 'guia',
    valor,
    alCambiar,
    deshabilitado,
    atributos: atributosDelTexto(etiquetaId, errorId, invalido),
  })
  const bloque = useBloqueElegido(editor)
  const caja = useCajaDelBloque(editor, contenedor)
  const { selector, clave, elegir } = useElegirBloque(editor)
  const menu = useMenuDeBloques(editor, elegir)

  const alSalirDelFoco = (evento: FocusEvent<HTMLDivElement>) => {
    if (!sigueEnElEditor(evento)) {
      setActivo(false)
    }
  }
  const alPulsar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.altKey && evento.key === 'F10') {
      evento.preventDefault()
      contenedor.current
        ?.querySelector<HTMLButtonElement>('[data-barrita-del-bloque] button:not(:disabled)')
        ?.focus()
    }
  }

  const visible = activo && editor !== null && bloque !== null && caja !== null && !deshabilitado
  const conMenu = visible && menu.abierto

  return (
    <div
      ref={contenedor}
      className="relative min-w-0"
      onFocus={() => {
        setActivo(true)
      }}
      onBlur={alSalirDelFoco}
      onKeyDown={alPulsar}
    >
      <EditorContent editor={editor} />
      {visible && !conMenu && bloque.vacio ? (
        <InsertadorDeBloques editor={editor} caja={caja} deshabilitado={deshabilitado} />
      ) : null}
      {visible ? (
        <BarritaDelBloque
          editor={editor}
          bloque={bloque}
          caja={caja}
          deshabilitado={deshabilitado}
          alAbrirOpciones={alAbrirOpciones}
        />
      ) : null}
      {conMenu ? (
        <div className="absolute z-20" style={{ top: caja.top + caja.height + 4, left: caja.left }}>
          <MenuDeBloques
            id={idDelMenu}
            bloques={menu.bloques}
            elegido={menu.elegido}
            alElegir={elegir}
            alPasar={menu.elegirNumero}
          />
        </div>
      ) : null}
      <SelectorDeImagenes ref={selector} editor={editor} clave={clave} />
    </div>
  )
}
