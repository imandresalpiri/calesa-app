import { Extension, type Extensions } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { hrefSeguro } from '../../../entities/contenido/doc'
import { ImagenDelSitio } from './imagen'

export type ModoDelEditor = 'documento' | 'guia'

// `Ctrl/Cmd+Enter` es «guardar» en toda la app: acá adentro no inserta un salto (el salto es `Shift+Enter`).
export const SinSaltoConModEnter = Extension.create({
  name: 'sinSaltoConModEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => true }
  },
})

export const LINK = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  protocols: ['mailto', 'tel'],
  isAllowedUri: (url: string) => hrefSeguro(url) !== null,
  HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null, class: null },
}

// Sólo lo que la lista blanca del sitio admite: títulos 2 y 3, párrafos, negrita, cursiva, las dos listas, la cita, enlaces y la imagen. Lo demás de
// StarterKit, apagado; lo que se pega pasa por este esquema y se cae lo que no está. El modo `guia` suma el separador (y, en `bloques/`, la galería, el
// botón y el video): los legales usan el modo `documento` y no los llevan.
export function extensionesDelSitio(modo: ModoDelEditor): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: modo === 'guia' ? undefined : false,
      strike: false,
      underline: false,
      dropcursor: false,
      link: LINK,
    }),
    ImagenDelSitio,
    SinSaltoConModEnter,
  ]
}
