'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Opciones } from '@/shared/ui/opciones'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { TextoDeValor } from '@/shared/ui/xcell'
import { DECIMALES_DE_CELDA, ejemploDeDecimales } from '../../../../../entities/decimales-de-celda'
import type { Nodo } from '../../../../../entities/nodos'

const AUTOMATICO = 'automatico'

const OPCIONES = [
  { valor: AUTOMATICO, etiqueta: 'Automático' },
  ...DECIMALES_DE_CELDA.map((d) => ({ valor: String(d), etiqueta: String(d) })),
]

const eleccionDe = (decimales: number | undefined): string =>
  decimales === undefined ? AUTOMATICO : String(decimales)

const decimalesDeLaEleccion = (eleccion: string): number | undefined =>
  eleccion === AUTOMATICO ? undefined : Number(eleccion)

type Props = {
  nodo: Nodo
  // El rechazo de `cambiarDecimales()`, o nulo: va en su línea, sobre el pie, y lo elegido queda.
  motivo: string | null
  // `null`: «Automático».
  alAplicar: (decimales: number | null) => void
  alCancelar: () => void
}

// Los «Decimales» de una celda (glosario): «Automático» o 0 a 4, en radios a la vista, y el ejemplo con la cifra fija de `ejemploDeDecimales()` (lo de
// «Automático» → lo elegido), que no cambia de alto al cambiar de opción. Cerrar con algo elegido pregunta.
export function FormularioDeDecimales({ nodo, motivo, alAplicar, alCancelar }: Props) {
  const id = `${useId()}-decimales`
  const inicial = eleccionDe(nodo.decimales)
  const [eleccion, setEleccion] = useState(inicial)
  const radios = useRef<HTMLDivElement>(null)
  useCambiosSinGuardar(eleccion !== inicial, undefined, { preguntaAlCerrar: true })
  // Con un rechazo, el foco vuelve al radio elegido (lo elegido queda y el motivo se lee).
  useEffect(() => {
    if (motivo !== null) radios.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
  }, [motivo])
  const ejemplo = ejemploDeDecimales(nodo)
  return (
    <form
      id={id}
      aria-label="Decimales"
      className="grid min-w-0 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        alAplicar(decimalesDeLaEleccion(eleccion) ?? null)
      }}
    >
      <div ref={radios} className="min-w-0">
        <Opciones
          etiqueta="Cuántos decimales muestra"
          ayuda="Sólo cambia cómo se ve: la cuenta usa el valor completo."
          opciones={OPCIONES}
          valor={eleccion}
          alCambiar={setEleccion}
        />
      </div>
      <p data-ejemplo-de-decimales="" className="min-h-[3lh] text-(--color-ink) tabular-nums">
        Se ve así:{' '}
        <span className="whitespace-nowrap">
          <TextoDeValor {...ejemplo} decimales={undefined} />
        </span>{' '}
        →{' '}
        <span className="whitespace-nowrap">
          <TextoDeValor {...ejemplo} decimales={decimalesDeLaEleccion(eleccion)} />
        </span>
      </p>
      <p
        data-motivo-de-decimales=""
        aria-live="polite"
        className="min-h-[2lh] text-(length:--text-sm) text-(--color-aviso-ink)"
      >
        {motivo}
      </p>
      <PieDelPanel
        idFormulario={id}
        enCurso={false}
        alCancelar={alCancelar}
        etiquetaDeGuardar="Aplicar"
      />
    </form>
  )
}
