// Las operaciones del lienzo que ofrecen la barra y el menú contextual, con su texto y la acción del editor, en el orden en que se muestran (como Excel). Sólo datos.
import type { ClaveAtajo } from '@/shared/lib/atajos'
import type { OperacionDeLaBarra } from '../../../../entities/plantilla/edicion/disponibilidad'

// `atajo`: la tecla de la pantalla que la hace (`ATAJOS`), para decirla junto al texto.
export type GrupoDeOperaciones = readonly {
  clave: OperacionDeLaBarra
  texto: string
  atajo?: ClaveAtajo
}[]

export const DEL_PORTAPAPELES: GrupoDeOperaciones = [
  { clave: 'pegar', texto: 'Pegar' },
  { clave: 'vaciar', texto: 'Vaciar' },
]
export const DE_LA_COMBINACION: GrupoDeOperaciones = [
  { clave: 'combinar', texto: 'Combinar', atajo: 'combinarCeldas' },
  { clave: 'separar', texto: 'Separar', atajo: 'separarCeldas' },
]
export const PARA_INSERTAR: GrupoDeOperaciones = [
  { clave: 'filaArriba', texto: 'Fila arriba', atajo: 'insertarFilaArriba' },
  { clave: 'filaAbajo', texto: 'Fila abajo', atajo: 'insertarFilaAbajo' },
  {
    clave: 'columnaIzquierda',
    texto: 'Columna a la izquierda',
    atajo: 'insertarColumnaIzquierda',
  },
  { clave: 'columnaDerecha', texto: 'Columna a la derecha', atajo: 'insertarColumnaDerecha' },
]
export const PARA_ELIMINAR: GrupoDeOperaciones = [
  { clave: 'eliminarFilas', texto: 'Filas' },
  { clave: 'eliminarColumnas', texto: 'Columnas' },
]
