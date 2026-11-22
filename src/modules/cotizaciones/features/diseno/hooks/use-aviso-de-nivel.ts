'use client'

import { useState } from 'react'
import type { ClaveDePieza, Diseno } from '../../../entities/diseno'
import { avisoDelCambioDeNivel, cambioDeNivel } from '../../../entities/diseno/nivel-al-mover'
import { piezaDelItemDeLaHoja, type PiezaDeLaHoja } from '../../../entities/diseno/pieza-de-la-hoja'

type Lado = { diseno: Diseno; seccion: string }
export type AvisoDeNivel = { pieza: PiezaDeLaHoja; texto: string }

// «Ahora la ve «Costos»: antes la veían todos.»: lo que el inspector dice de la pieza que se movió a una sección con otro nivel efectivo. Queda hasta el próximo
// movimiento o hasta que se cierra.
export function useAvisoDeNivel(nombresDeNiveles: ReadonlyMap<string, string>) {
  const [aviso, setAviso] = useState<AvisoDeNivel | null>(null)
  return {
    aviso,
    anotar: (antes: Lado, despues: Lado, clave: ClaveDePieza) => {
      const cambio = cambioDeNivel(antes, despues, clave)
      const pieza = piezaDelItemDeLaHoja(clave)
      setAviso(
        cambio === null
          ? null
          : { pieza, texto: avisoDelCambioDeNivel(cambio, (c) => nombresDeNiveles.get(c) ?? c) },
      )
    },
    cerrar: () => {
      setAviso(null)
    },
  }
}
