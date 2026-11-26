'use client'

import { useState } from 'react'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Resultado } from '@/shared/lib/errores'
import type { OperacionesDelCatalogo } from './tipos'

type Crear = (nombre: string) => Promise<Resultado<ElementoDeCatalogo>>

// Lo creado desde el combo no revalida (se perdería lo tipeado en el formulario: `docs/LECCIONES.md`), así que se suma a lo leído
// hasta que la lectura lo trae: el combo y el drawer lo ven aunque el formulario se descarte. Lo leído gana por id (un renombre ya
// revalidado) y lo que el drawer quita sale también de aquí.
export function useConLosCreados(lista: readonly ElementoDeCatalogo[]) {
  const [creados, setCreados] = useState<readonly ElementoDeCatalogo[]>([])
  return {
    lista: [
      ...lista,
      ...creados.filter((creado) => !lista.some((leido) => leido.id === creado.id)),
    ],
    conCrear:
      (crear: Crear): Crear =>
      async (nombre) => {
        const creado = await crear(nombre)
        if (creado.ok) {
          setCreados((antes) => [...antes, creado.data])
        }
        return creado
      },
    conQuitar: (operaciones: OperacionesDelCatalogo): OperacionesDelCatalogo => ({
      ...operaciones,
      quitar: async (elemento, destino) => {
        const quitado = await operaciones.quitar(elemento, destino)
        if (quitado.ok) {
          setCreados((antes) => antes.filter((creado) => creado.id !== elemento.id))
        }
        return quitado
      },
    }),
  }
}
