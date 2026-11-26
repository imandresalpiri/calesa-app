import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Resultado } from '@/shared/lib/errores'

// Lo que dice el combo de un catálogo: cada uso nombra lo suyo («grupo», «categoría»).
export type TextosDelCombo = {
  // La opción de no elegir ninguno: «Sin grupo».
  sinValor: string
  // El nombre del campo de búsqueda para el lector de pantalla y su texto de ejemplo.
  buscar: string
  // La opción de crear lo escrito: «Crear grupo «Medidas»».
  crear: (nombre: string) => string
  // Con el catálogo vacío y nada escrito.
  vacio: string
  // Lo escrito ya existe con otra escritura: «Ya existe «Datos del Cliente».», y si está inactivo, cómo activarlo.
  existe: (nombre: string) => string
  inactivo: (nombre: string) => string
}

export type PropsDelCombo = {
  // El id del botón (la etiqueta lo nombra).
  nombre: string
  etiqueta: string
  // El id elegido; null = ninguno.
  valor: string | null
  // En el orden del catálogo, también los inactivos (el elegido se ofrece aunque lo esté).
  elementos: readonly ElementoDeCatalogo[]
  // El catálogo pasó su tope: la lista dice que muestra los primeros.
  hayMas: boolean
  textos: TextosDelCombo
  // Sin permiso para crear no se ofrece «Crear».
  puedeCrear: boolean
  alElegir: (id: string | null) => void
  // Crea y elige en un paso; un rechazo («Ya existe «X».») lo dice la lista y conserva lo escrito.
  alCrear: (nombre: string) => Promise<Resultado<ElementoDeCatalogo>>
  ayuda?: string
  error?: string
  deshabilitado?: boolean
}

// Lo que recibe la lista (diferida): lo mismo, con el elegido ya resuelto y cerrar al elegir.
export type PropsDeLaLista = Pick<
  PropsDelCombo,
  'etiqueta' | 'valor' | 'elementos' | 'hayMas' | 'textos' | 'puedeCrear'
> & {
  alElegir: (id: string | null) => void
  alCrear: (nombre: string) => Promise<string | null>
}
