// El hueco «+ Nuevo color» del panel de una banda (glosario: «Nuevo color al vuelo»): el área `formula` lo ofrece y el área `diseno` lo dibuja (el modal de «Nuevo
// color» de la sección de colores), sin importarse (dos áreas no se importan). Estos tipos, sin código, son lo único que comparten; `src/app` las une
// (`pantallas/diseno-nuevo-color.ts`) y sólo lo pasa con `cotizaciones.configurar`.
import type { ColoresDeUnTema } from './colores'

// El color recién creado en el catálogo, como lo usa una banda: su clave (la que guarda el grupo), su nombre y sus versiones de la hoja.
export type ColorCreado = {
  readonly clave: string
  readonly nombre: string
  readonly claro: ColoresDeUnTema
  readonly oscuro: ColoresDeUnTema
}

export type PropsDelNuevoColor = {
  abierto: boolean
  alCerrar: () => void
  // Los colores que ya hay, para decir «Ya hay un color «X».» y el tope antes de enviar (`id`: cualquier id único del color; al crear no se compara con nada).
  existentes: readonly { readonly id: string; readonly nombre: string }[]
  tope?: number
  alCrear: (color: ColorCreado) => void
  // A dónde va el foco al cerrar: un elemento, o `true` para el que tenía el foco al abrir (por defecto).
  focoAlCerrar?: () => HTMLElement | boolean
}
