'use client'

import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { useMontoEnTexto } from '@/shared/ui/monto-en-texto'

type Props = {
  abierto: boolean
  monto: number
  moneda: string
  unidades: number
  // Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice).
  confirmar: () => Promise<ErrorApp | null>
  alCerrar: () => void
}

// La confirmación del prorrateo (`?panel=prorratear`): nombra el reparto («Repartir 100,00 USD entre 3 unidades»; con el Modo Live, sin la moneda: `useMontoEnTexto()`). Si una unidad falla, no se crea ninguno.
export function ConfirmarProrrateo({
  abierto,
  monto,
  moneda,
  unidades,
  confirmar,
  alCerrar,
}: Props) {
  const montoEnTexto = useMontoEnTexto()
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function alConfirmar() {
    setError(null)
    setEnCurso(true)
    const rechazo = await confirmar()
    setEnCurso(false)
    if (rechazo === null) {
      cerrar()
    } else {
      setError(rechazo)
    }
  }

  const cuantas = unidades === 1 ? '1 unidad' : `${String(unidades)} unidades`
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={alConfirmar}
      titulo={`Repartir ${montoEnTexto(monto, { moneda })} entre ${cuantas}`}
      descripcion="Se crea un gasto en cada unidad, en partes iguales. Si una unidad falla, no se crea ninguno."
      etiquetaConfirmar="Repartir"
      enCurso={enCurso}
    >
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
