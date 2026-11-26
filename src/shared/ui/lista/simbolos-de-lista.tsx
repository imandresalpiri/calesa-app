// Los iconos que una lista repite en cada fila, dibujados UNA vez y usados con `<use href="#…">`. Un icono de lucide son un `<svg>`
// con cada trazo adentro (el «⋯» eran 6 nodos por fila: en una columna de 500 tarjetas, 3.000); con el sprite, el botón lleva un
// `<svg>` y un `<use>` (3 con el botón). Cada icono es un `<g>` dentro de `<defs>`: se dibuja como si estuviera escrito en el botón.
// Lo monta el layout `(app)` una sola vez; un `<use>` que apunta a un id que no está no dibuja nada, así que el test de `lista`
// comprueba que cada id que se usa existe acá y `e2e/mas-acciones-icono.spec.ts` que se ve igual que el icono de trazos.
export const ID_DEL_ICONO_MAS_ACCIONES = 'icono-mas-acciones'
export const ID_DEL_ICONO_MAS = 'icono-mas'
export const ID_DEL_ICONO_OJO = 'icono-ojo'
// El hueco de la foto de un vehículo (`<Miniatura>`): cada tarjeta del panel del vehículo lo repite (el de lucide son 7 nodos; con el sprite, 2).
export const ID_DEL_ICONO_AUTO = 'icono-auto'

// Los atributos de trazo van en el `<svg>` que usa el icono (se heredan): así el icono sigue el `currentColor` de su botón.
export const TRAZO_DE_LOS_ICONOS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function SimbolosDeLista() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
    >
      <defs>
        <g id={ID_DEL_ICONO_MAS_ACCIONES}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </g>
        <g id={ID_DEL_ICONO_OJO}>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </g>
        <g id={ID_DEL_ICONO_AUTO}>
          <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
          <path d="M7 14h.01" />
          <path d="M17 14h.01" />
          <rect width="18" height="8" x="3" y="10" rx="2" />
          <path d="M5 18v2" />
          <path d="M19 18v2" />
        </g>
        <g id={ID_DEL_ICONO_MAS}>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </g>
      </defs>
    </svg>
  )
}

// El icono, de 1rem como el resto (crece con el texto al 200 %).
export function IconoDeLista({ id, className = 'size-4' }: { id: string; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      {...TRAZO_DE_LOS_ICONOS}
    >
      <use href={`#${id}`} />
    </svg>
  )
}
