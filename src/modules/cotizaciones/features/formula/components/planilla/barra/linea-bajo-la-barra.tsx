'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import type { Planilla } from '../../../hooks/use-planilla'
import { EstadoDelTexto } from '../comunes/estado-del-texto'

const SOLTADOS: Record<string, string> = {
  sobrescribible: 'se puede modificar',
  condicion: 'interruptor',
  solo_en: 'variantes',
  formato: 'formato',
}

type Props = {
  planilla: Planilla
  fila: FilaDeLaHoja
  puedeCambiarTiposDeCambio: boolean
}

// La línea bajo la barra sin nada escrito: de dónde sale la fila elegida, en palabras (lo que la fórmula hace con ella), y, separado por «·», lo que el último
// cambio soltó de la fila y, en un tipo de cambio, el camino a Empresa › Monedas (no se versiona). Lo que dice su texto tras un ⚙ (reescrito o «ya no manda»)
// va debajo, sólo cuando pasa.
export function LineaBajoLaBarra({ planilla, fila, puedeCambiarTiposDeCambio }: Props) {
  const { aplicada } = planilla.editor
  const soltados = aplicada?.id === fila.id ? aplicada.soltados : []
  const texto = planilla.editor.filas.find((f) => f.id === fila.id)?.texto
  const dicho = planilla.calculo.dichas.get(fila.id) ?? ''
  const partes = [
    dicho === '' ? null : (
      <span key="dicho">
        De dónde sale: <span className="text-(--color-ink)">{dicho}</span>
      </span>
    ),
    soltados.length === 0 ? null : (
      <span key="soltados">
        Al aplicar se soltó: {soltados.map((s) => SOLTADOS[s] ?? s).join(', ')}.
      </span>
    ),
    fila.tipo === 'tipo_de_cambio' && puedeCambiarTiposDeCambio ? (
      <span key="monedas">
        El tipo de cambio no se versiona: cambia varias veces por semana.{' '}
        <Link
          href={RUTAS.monedasDeEmpresa as Route}
          className="text-(--color-primario-ink) underline"
        >
          Cambiar en Empresa › Monedas
        </Link>
      </span>
    ) : null,
  ].filter((p) => p !== null)
  return (
    <div
      data-linea-bajo-la-barra=""
      className="grid min-w-0 gap-1 text-(length:--text-sm) text-(--color-ink-soft)"
    >
      {partes.length === 0 ? null : (
        <p className="min-w-0 break-words">
          {partes.flatMap((p, i) => (i === 0 ? [p] : [<span key={`s${String(i)}`}> · </span>, p]))}
        </p>
      )}
      {texto === undefined || texto.modo === 'campos' ? null : (
        <EstadoDelTexto texto={texto} sinTexto />
      )}
    </div>
  )
}
