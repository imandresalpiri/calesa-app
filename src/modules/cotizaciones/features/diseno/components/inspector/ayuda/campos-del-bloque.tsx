'use client'

import type { BloqueDeAyuda } from '../../../../../entities/diseno'
import type { DondeDelBloque } from '../../../../../entities/diseno/edicion-de-la-ayuda'
import {
  tablasParaAyuda,
  type CeldaQueAceptaValor,
} from '../../../../../entities/diseno/tabla-del-bloque'
import type { ApoyoDelInspector } from '../apoyo-del-inspector'
import { CamposDeLaTabla } from './campos-de-la-tabla'
import { CamposDeLosEnlaces } from './campos-de-los-enlaces'
import { CamposDelTexto } from './campos-del-texto'

type Props = {
  nombre: string
  donde: DondeDelBloque
  bloque: BloqueDeAyuda
  // Las celdas que «Llena la celda» ofrece (`celdasQueAceptanValor()`, una vez por ayuda).
  celdas: readonly CeldaQueAceptaValor[]
  apoyo: ApoyoDelInspector
}

// Los campos de un bloque según su tipo, atados a las ediciones de la ayuda en ese lugar.
export function CamposDelBloque({ nombre, donde, bloque, celdas, apoyo }: Props) {
  const { editor, catalogoDeTablas, origen } = apoyo
  const ayuda = apoyo.ediciones.ayuda
  const ocupado = editor.ocupado
  switch (bloque.tipo) {
    case 'titulo':
    case 'texto':
      return (
        <CamposDelTexto
          nombre={nombre}
          tipo={bloque.tipo}
          texto={bloque.texto}
          ocupado={ocupado}
          alEscribir={(texto) => {
            ayuda.ponerTexto(donde, texto)
          }}
        />
      )
    case 'enlaces':
      return (
        <CamposDeLosEnlaces
          base={nombre}
          enlaces={bloque.enlaces}
          ocupado={ocupado}
          acciones={{
            sumar: () => {
              ayuda.sumarEnlace(donde)
            },
            poner: (posicion, cambios) => {
              ayuda.ponerEnlace({ ...donde, posicion }, cambios)
            },
            quitar: (posicion) => {
              ayuda.quitarEnlace({ ...donde, posicion })
            },
          }}
        />
      )
    case 'tabla': {
      // Las columnas de la tabla en el catálogo, en su orden (sin catálogo o sin la tabla, no se eligen).
      const todas =
        catalogoDeTablas?.find((t) => t.clave === bloque.tabla)?.columnas.map((c) => c.clave) ?? []
      return (
        <CamposDeLaTabla
          nombre={nombre}
          bloque={bloque}
          origen={origen}
          catalogo={catalogoDeTablas}
          deLaFormula={tablasParaAyuda(editor.definicion, bloque.tabla)}
          celdas={celdas}
          ocupado={ocupado}
          acciones={{
            ponerTabla: (tabla) => {
              ayuda.ponerTabla(donde, tabla)
            },
            mostrar: (columna, mostrar) => {
              ayuda.mostrarColumna({ ...donde, columna }, todas, mostrar)
            },
            llenar: (columna, llena) => {
              ayuda.ponerLlena({ ...donde, columna }, todas, llena)
            },
            resaltar: (resaltar) => {
              ayuda.ponerResaltar(donde, resaltar)
            },
          }}
        />
      )
    }
  }
}
