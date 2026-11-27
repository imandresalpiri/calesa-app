// El alto de la unidad de logística en escritorio, para que la página no se desplace: la pantalla menos la barra superior (`--topbar`) y 10,5 rem que no son de la unidad: el relleno de `<main>` (5 rem: 1,5 arriba
// y 3,5 abajo, sitio para los botones flotantes), la barra de Logística desde `md` (4,5 rem: sus dos filas, `h-9` y `h-8`, y el `gap-1`; `barra-de-logistica.tsx`) y el
// `gap-4` que la separa de la unidad (1 rem). Lo define `src/app`, no el módulo: es el marco el que sabe cuánto ocupa. `PaginaDeLaUnidad` lo usa (`h-(--alto-del-detalle)`)
// sólo desde 56 rem de contenedor; por debajo el alto es natural. Una clase literal, para que Tailwind la vea.
export const CLASE_DEL_ALTO_DEL_DETALLE = '[--alto-del-detalle:calc(100dvh-var(--topbar)-10.5rem)]'
