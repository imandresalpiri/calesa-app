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

// Al menos el alto de lo que entra ahí mientras se escribe («Siguiente», un botón chico de 28 px; con el dedo, «Siguiente» y «Elegir celda», blancos táctiles de
// 44 px), haya algo que decir o no: elegir una celda, empezar a escribir o llegar a un lugar por llenar no mueve la grilla.
export const RENGLON_BAJO_LA_BARRA =
  'min-h-7 min-w-0 text-(length:--text-sm) pointer-coarse:min-h-[44px]'

type Pieza = { clave: string; etiqueta?: string; texto: string }

// Lo que dice la línea, en orden: de dónde sale, lo soltado y que el tipo de cambio no se versiona.
function piezasDe(dicho: string, soltados: readonly string[], conMonedas: boolean): Pieza[] {
  const piezas: Pieza[] = []
  if (dicho !== '') piezas.push({ clave: 'dicho', etiqueta: 'De dónde sale: ', texto: dicho })
  if (soltados.length > 0) {
    const nombres = soltados.map((s) => SOLTADOS[s] ?? s).join(', ')
    piezas.push({ clave: 'soltados', texto: `Al aplicar se soltó: ${nombres}.` })
  }
  if (conMonedas) {
    piezas.push({
      clave: 'monedas',
      texto: 'El tipo de cambio no se versiona: cambia varias veces por semana.',
    })
  }
  return piezas
}

// La línea bajo la barra sin nada escrito, en un solo renglón (lo largo se corta con «…» y va entero en `title`; elegir otra celda no mueve la grilla): de dónde
// sale la fila elegida, en palabras (lo que la fórmula hace con ella), y, separado por «·», lo que el último cambio soltó de la fila y, en un tipo de cambio, que
// no se versiona, con el camino a Empresa › Monedas siempre a la vista. Lo que dice su texto tras un ⚙ (reescrito o «ya no manda») va debajo, sólo cuando pasa.
export function LineaBajoLaBarra({ planilla, fila, puedeCambiarTiposDeCambio }: Props) {
  const { aplicada } = planilla.editor
  const soltados = aplicada?.id === fila.id ? aplicada.soltados : []
  const texto = planilla.editor.filas.find((f) => f.id === fila.id)?.texto
  const conMonedas = fila.tipo === 'tipo_de_cambio' && puedeCambiarTiposDeCambio
  const piezas = piezasDe(planilla.calculo.dichas.get(fila.id) ?? '', soltados, conMonedas)
  return (
    <div
      data-linea-bajo-la-barra=""
      className={`grid gap-1 text-(--color-ink-soft) ${RENGLON_BAJO_LA_BARRA}`}
    >
      {piezas.length === 0 ? null : (
        <div className="flex min-w-0 items-baseline gap-1">
          <p
            className="min-w-0 truncate"
            title={piezas.map((p) => `${p.etiqueta ?? ''}${p.texto}`).join(' · ')}
          >
            {piezas.map((p, i) => (
              <span key={p.clave}>
                {i === 0 ? null : ' · '}
                {p.etiqueta}
                {p.etiqueta === undefined ? (
                  p.texto
                ) : (
                  <span className="text-(--color-ink)">{p.texto}</span>
                )}
              </span>
            ))}
          </p>
          {conMonedas ? (
            <Link
              href={RUTAS.monedasDeEmpresa as Route}
              className="shrink-0 whitespace-nowrap text-(--color-primario-ink) underline"
            >
              Cambiar en Empresa › Monedas
            </Link>
          ) : null}
        </div>
      )}
      {texto === undefined || texto.modo === 'campos' ? null : (
        <EstadoDelTexto texto={texto} sinTexto />
      )}
    </div>
  )
}
