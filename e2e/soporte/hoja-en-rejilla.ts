// La hoja de tres sumandos en la rejilla libre (docs/GLOSARIO.md › «Posición (en la rejilla)»): «Base» a lo ancho con «Precio» y «Flete» de 6 columnas,
// cada una en su fila, y debajo «Extras» y «Resumen», una al lado de la otra. Lo usan el e2e del editor (que deja el hueco moviendo «Precio») y el de la hoja
// (que lo dibuja): los dos parten del mismo diseño, y el de la hoja lo recibe con «Precio» ya en la columna 7.
import { publicarFormulaDeTresSumandos } from './diseno-editor'

type Posicion = { columna: number; fila: number }

export const PRECIO_A_LA_IZQUIERDA: Posicion = { columna: 1, fila: 1 }
// Donde lo deja el editor: la mitad derecha de su fila, con la izquierda libre.
export const PRECIO_CON_EL_HUECO: Posicion = { columna: 7, fila: 1 }

const celda = (nodo: string, ancho: number, posicion: Posicion) => ({
  tipo: 'celda',
  nodo,
  ancho,
  posicion,
})

export function disenoEnLaRejilla(precio: Posicion) {
  return {
    cabecera: { modos: [], ver_total_bs: false },
    secciones: [
      {
        id: 'base',
        titulo: 'Base',
        presentacion: 'principal',
        posicion: { columna: 1, fila: 1 },
        ancho: 12,
        items: [celda('precio', 6, precio), celda('flete', 6, { columna: 1, fila: 2 })],
      },
      {
        id: 'extras',
        titulo: 'Extras',
        presentacion: 'principal',
        posicion: { columna: 1, fila: 2 },
        items: [celda('aduana', 12, { columna: 1, fila: 1 })],
      },
      {
        id: 'resumen',
        titulo: 'Resumen',
        presentacion: 'principal',
        posicion: { columna: 7, fila: 2 },
        items: [celda('total', 12, { columna: 1, fila: 1 })],
      },
    ],
    tarjeta_total: { nodo: 'total', secundarios: [] },
  }
}

// Publica la versión 1 del origen con la fórmula de tres sumandos en la rejilla, con «Precio» donde se diga.
export function publicarLaHojaEnLaRejilla(origenId: string, precio: Posicion): void {
  publicarFormulaDeTresSumandos(origenId, disenoEnLaRejilla(precio))
}
