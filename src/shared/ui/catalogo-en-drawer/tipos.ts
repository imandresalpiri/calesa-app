import type { DestinoAlQuitar, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Envio } from '@/shared/lib/enviar-accion'

export type { DestinoAlQuitar }

// Lo que el drawer hace con el catálogo: las actions del módulo, ya envueltas con `enviarAccion()`. Toda edición manda la versión
// que vio (`elemento.actualizadoEn`). Un rechazo de un dato viaja en `porCampo` con la clave del `hint` de la base: `nombre`
// («Ya existe «X».»), `items` (tiene ítems: hay que moverlos) o `destino` («Elige un grupo activo…»).
export type OperacionesDelCatalogo = {
  agregar: (nombre: string) => Promise<Envio<unknown>>
  renombrar: (elemento: ElementoDeCatalogo, nombre: string) => Promise<Envio<unknown>>
  activar: (elemento: ElementoDeCatalogo, activo: boolean) => Promise<Envio<unknown>>
  mover: (elemento: ElementoDeCatalogo, despuesDe: string | null) => Promise<Envio<unknown>>
  quitar: (elemento: ElementoDeCatalogo, destino: DestinoAlQuitar) => Promise<Envio<unknown>>
  enCurso: boolean
}

// Lo que dice el drawer, en el género y el número de su catálogo.
export type TextosDelCatalogo = {
  // El botón que lo abre y el título del panel: «Grupos» / «Grupos de campos».
  boton: string
  titulo: string
  descripcion: string
  // El elemento, para las frases: «grupo» / «categoría»; y su artículo: «el» / «la».
  elemento: string
  articulo: 'el' | 'la'
  // Los ítems que tiene cada uno: «campo» y «campos» / «pregunta» y «preguntas», con su género («muévelos» / «muévelas»).
  item: { uno: string; varios: string; genero: 'm' | 'f' }
  // El destino sin elemento al mover sus ítems: «Sin grupo».
  ninguno: string
  vacioTitulo: string
  vacioDescripcion: string
  // El aviso de tope: «los primeros 100 grupos por orden».
  tope: { sustantivo: string; articulo: 'los' | 'las'; orden: string }
  // Lo que se avisa al terminar: «Grupo agregado», «Grupo renombrado», …
  hechos: {
    agregado: string
    renombrado: string
    activado: string
    desactivado: string
    quitado: string
  }
}

export type PropsDelCatalogo = {
  // El valor de `?panel=` que lo abre: `grupos`, `categorias`.
  panel: string
  // En su orden, también los inactivos, con su tope.
  catalogo: { lista: readonly ElementoDeCatalogo[]; hayMas: boolean }
  // Cuántos ítems tiene cada elemento, sobre lo ya cargado.
  usos: ReadonlyMap<string, number>
  operaciones: OperacionesDelCatalogo
  textos: TextosDelCatalogo
  maximoDelNombre: number
  // Sin permiso, de sólo lectura: el motivo se dice arriba y en cada acción apagada.
  motivoSinPermiso: string | null
}
