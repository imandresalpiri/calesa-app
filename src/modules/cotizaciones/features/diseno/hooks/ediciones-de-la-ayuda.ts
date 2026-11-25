import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { BloqueDeAyuda, Diseno, EnlaceDeAyuda, TipoDeBloque } from '../../../entities/diseno'
import {
  devolverBloque,
  moverBloque,
  NOMBRES_DE_BLOQUE,
  ponerEnlace,
  ponerTextoDelBloque,
  quitarBloque,
  quitarEnlace,
  sumarBloque,
  sumarEnlace,
  type DondeDeLaAyuda,
  type DondeDelBloque,
  type DondeDelEnlace,
} from '../../../entities/diseno/edicion-de-la-ayuda'
import {
  mostrarColumna,
  ponerLlena,
  ponerResaltar,
  ponerTablaDelBloque,
  type DondeDeLaColumna,
} from '../../../entities/diseno/tabla-del-bloque'

// Las operaciones puras de la ayuda de una celda (`edicion-de-la-ayuda.ts`, `tabla-del-bloque.ts`), atadas a `aplicar` del editor. Quitar un bloque ofrece
// «Deshacer»: lo devuelve a su lugar sobre el diseño de ese momento (lo editado entre medio queda).
export function edicionesDeLaAyuda(aplicar: (cambio: (d: Diseno) => Diseno) => void) {
  return {
    sumarBloque: (donde: DondeDeLaAyuda, tipo: TipoDeBloque, tabla?: string) => {
      aplicar((d) => sumarBloque(d, donde, tipo, tabla))
    },
    ponerTexto: (donde: DondeDelBloque, texto: string) => {
      aplicar((d) => ponerTextoDelBloque(d, donde, texto))
    },
    moverBloque: (donde: DondeDelBloque, destino: number) => {
      aplicar((d) => moverBloque(d, donde, destino))
    },
    quitarBloque: (donde: DondeDelBloque, bloque: BloqueDeAyuda) => {
      aplicar((d) => quitarBloque(d, donde))
      avisarConDeshacer(
        `Quitaste el bloque «${NOMBRES_DE_BLOQUE[bloque.tipo]}» de la ayuda.`,
        () => {
          aplicar((d) => devolverBloque(d, donde, bloque))
        },
      )
    },
    sumarEnlace: (donde: DondeDelBloque) => {
      aplicar((d) => sumarEnlace(d, donde))
    },
    ponerEnlace: (donde: DondeDelEnlace, cambios: Partial<EnlaceDeAyuda>) => {
      aplicar((d) => ponerEnlace(d, donde, cambios))
    },
    quitarEnlace: (donde: DondeDelEnlace) => {
      aplicar((d) => quitarEnlace(d, donde))
    },
    ponerTabla: (donde: DondeDelBloque, tabla: string) => {
      aplicar((d) => ponerTablaDelBloque(d, donde, tabla))
    },
    // `todas`: las columnas de la tabla en el catálogo, en su orden.
    mostrarColumna: (donde: DondeDeLaColumna, todas: readonly string[], mostrar: boolean) => {
      aplicar((d) => mostrarColumna(d, donde, todas, mostrar))
    },
    ponerLlena: (donde: DondeDeLaColumna, todas: readonly string[], llena: string | null) => {
      aplicar((d) => ponerLlena(d, donde, todas, llena))
    },
    ponerResaltar: (donde: DondeDelBloque, resaltar: boolean) => {
      aplicar((d) => ponerResaltar(d, donde, resaltar))
    },
  }
}

export type EdicionesDeLaAyuda = ReturnType<typeof edicionesDeLaAyuda>
