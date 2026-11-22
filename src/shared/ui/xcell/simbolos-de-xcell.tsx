import { TRAZO_DE_LOS_ICONOS } from '../lista/simbolos-de-lista'

// Los iconos de la celda, dibujados UNA vez por hoja y usados con `<use href="#…">` (el patrón de `lista/simbolos-de-lista.tsx`): una
// celda paga 2 nodos por icono en vez de los 4 o 5 de un icono de lucide, y una hoja tiene cientos de celdas.
export const ID_DEL_CANDADO = 'xcell-candado'
export const ID_DE_RESTABLECER = 'xcell-restablecer'
export const ID_DEL_AVISO = 'xcell-aviso'
export const ID_DE_AYUDA = 'xcell-ayuda'
export const ID_DE_AJUSTES = 'xcell-ajustes'
// El lápiz de «Editado a mano»: la marca de un cálculo pisado (`MarcaDeEditado`).
export const ID_DE_EDITADO = 'xcell-editado'
export const IDS_DE_ICONOS_DE_XCELL = [
  ID_DEL_CANDADO,
  ID_DE_RESTABLECER,
  ID_DEL_AVISO,
  ID_DE_AYUDA,
  ID_DE_AJUSTES,
  ID_DE_EDITADO,
] as const

// La descripción que anuncia las flechas: la comparten todos los valores que tienen acciones, así que va UNA vez por hoja (0 nodos por celda).
// `hidden` no la saca del cálculo de `aria-describedby`.
export const ID_DEL_ATAJO = 'xcell-atajo'
export const TEXTO_DEL_ATAJO = 'Más acciones con la flecha derecha.'

export function SimbolosDeXCell() {
  return (
    <>
      <span id={ID_DEL_ATAJO} hidden>
        {TEXTO_DEL_ATAJO}
      </span>
      <svg
        aria-hidden
        focusable="false"
        width="0"
        height="0"
        className="pointer-events-none absolute"
      >
        <defs>
          <g id={ID_DEL_CANDADO}>
            <rect width="18" height="11" x="3" y="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </g>
          <g id={ID_DE_RESTABLECER}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </g>
          <g id={ID_DE_AYUDA}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </g>
          <g id={ID_DE_AJUSTES}>
            <path d="M14 17H5" />
            <path d="M19 7h-9" />
            <circle cx="17" cy="17" r="3" />
            <circle cx="7" cy="7" r="3" />
          </g>
          <g id={ID_DE_EDITADO}>
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            <path d="m15 5 4 4" />
          </g>
          <g id={ID_DEL_AVISO}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </g>
        </defs>
      </svg>
    </>
  )
}

// El icono de un id del sprite: 2 nodos (`<svg>` y `<use>`). Hereda el color del texto.
export type IdDeIcono = (typeof IDS_DE_ICONOS_DE_XCELL)[number]

export function IconoDeXCell({ id }: { id: IdDeIcono }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      {...TRAZO_DE_LOS_ICONOS}
    >
      <use href={`#${id}`} />
    </svg>
  )
}
