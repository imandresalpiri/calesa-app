'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import type { DatoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CLASE_DEL_MOTIVO } from './dato-elegible'
import { ElegirDato } from './elegir-dato'

type Props = {
  // Por qué no se puede insertar (pasaría de 20 partes); nulo si se puede.
  motivo: string | null
  abierto: boolean
  // El dato de la pastilla que se cambia (la tocada o la recién insertada): «Qué mostrar» lo muestra.
  actual: DatoDeLaCelda | null
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  alAbrir: () => void
  alElegir: (dato: DatoDeLaCelda) => void
  alListo: () => void
}

// «Insertar dato» del texto de una celda: el botón (apagado con su motivo) y, abierto, el buscador de «Dato» en línea con «Listo», como `DatoElegible`.
export function InsertarDato({
  motivo,
  abierto,
  actual,
  contexto,
  nombrados,
  alAbrir,
  alElegir,
  alListo,
}: Props) {
  const id = useId()
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={motivo !== null}
          aria-expanded={abierto}
          aria-describedby={motivo === null ? undefined : id}
          onClick={alAbrir}
        >
          Insertar dato
        </Button>
        {motivo === null ? null : (
          <p id={id} className={CLASE_DEL_MOTIVO}>
            {motivo}
          </p>
        )}
      </div>
      {abierto ? (
        <div className="grid min-w-0 gap-2 border-l-2 border-(--color-line) pl-2">
          <ElegirDato
            actual={actual}
            contexto={contexto}
            nombrados={nombrados}
            alElegir={alElegir}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full md:min-h-9"
            onClick={alListo}
          >
            Listo
          </Button>
        </div>
      ) : null}
    </>
  )
}
