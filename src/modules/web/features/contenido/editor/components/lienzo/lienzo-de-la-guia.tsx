'use client'

import { EditorContent } from '@tiptap/react'
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { useBloqueElegido } from '../../hooks/use-bloque-elegido'
import { useCajaDelBloque } from '../../hooks/use-caja-del-bloque'
import { useElegirBloque } from '../../hooks/use-elegir-bloque'
import { useMenuDeBloques } from '../../hooks/use-menu-de-bloques'
import { BarritaDelBloque } from './barrita-del-bloque'
import { InsertadorDeBloques } from './insertador-de-bloques'
import { MenuDeBloques } from './menu-de-bloques'
import { MenuFlotante } from './menu-flotante'
import { SelectorDeImagenes } from './selector-de-imagenes'

export type PropsDelLienzo = {
  editor: Editor | null
  deshabilitado: boolean
  // Abre la pestaña «Bloque» del panel (en una pantalla angosta, el cajón).
  alAbrirOpciones: () => void
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
export function LienzoDeLaGuia({ editor, deshabilitado, alAbrirOpciones }: PropsDelLienzo) {
  const idDelMenu = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)
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
        <MenuFlotante caja={caja}>
          <MenuDeBloques
            id={idDelMenu}
            bloques={menu.bloques}
            elegido={menu.elegido}
            alElegir={elegir}
            alPasar={menu.elegirNumero}
          />
        </MenuFlotante>
      ) : null}
      <SelectorDeImagenes ref={selector} editor={editor} clave={clave} />
    </div>
  )
}
