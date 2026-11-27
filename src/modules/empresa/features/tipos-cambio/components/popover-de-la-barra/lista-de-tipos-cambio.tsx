'use client'

import { useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import {
  TOPE_DEL_POPOVER,
  type TipoCambioVigente,
} from '../../../../entities/tipos-cambio-vigentes'
import { FilaDeTipoCambio } from './fila-de-tipo-cambio'

type Props = {
  filas: readonly TipoCambioVigente[]
  hayMas: boolean
  // Quien gestiona los tipos de cambio.
  puedeCambiar: boolean
  releer: () => Promise<TipoCambioVigente[] | null>
  alRetener: (retener: boolean) => void
}

// Los vigentes del popover (hasta 30, con el aviso del tope), cada uno con su último cambio; uno a la vez se edita.
export function ListaDeTiposCambio({ filas, hayMas, puedeCambiar, releer, alRetener }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  // El que se editaba ya no está entre los vigentes (otra persona lo desactivó): se dice en vez de dejar el editor sin fila.
  const seFue = puedeCambiar && editando !== null && !filas.some((tipo) => tipo.id === editando)

  return (
    <>
      {seFue ? (
        <Aviso tono="aviso">
          Ese tipo de cambio ya no está activo: lo que escribiste no se guardó.
        </Aviso>
      ) : null}
      <ul className="grid max-h-[60dvh] min-w-0 grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-y-auto">
        {filas.map((tipo) => (
          <FilaDeTipoCambio
            key={tipo.id}
            tipo={tipo}
            puedeCambiar={puedeCambiar}
            editando={editando === tipo.id}
            alEditar={() => {
              setEditando(tipo.id)
            }}
            alDejarDeEditar={() => {
              setEditando(null)
            }}
            releer={releer}
            alRetener={alRetener}
          />
        ))}
      </ul>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DEL_POPOVER, {
            sustantivo: 'primeros tipos de cambio',
            orden: 'activos',
          })}
        />
      ) : null}
    </>
  )
}
