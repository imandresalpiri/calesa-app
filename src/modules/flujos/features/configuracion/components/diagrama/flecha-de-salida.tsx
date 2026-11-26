'use client'

import { EdgeLabelRenderer, useInternalNode, type EdgeProps } from '@xyflow/react'
import { TriangleAlertIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import type { Punto } from '../../../../entities/disposicion-del-diagrama'
import { resumenDeMarcas } from '../../../../entities/marcas-del-diagrama'
import { trazarSalida, type TrazoDeSalida } from '../../../../entities/trazado-de-salidas'
import { useLienzo } from './contexto-del-lienzo'
import type { FlechaDeSalida as Flecha } from './datos-del-diagrama'

const RADIO = 8

// El camino por los puntos de la disposición, con las esquinas redondeadas.
function camino(puntos: readonly Punto[]): string {
  const [primero, ...resto] = puntos
  if (!primero) return ''
  let d = `M ${String(primero.x)} ${String(primero.y)}`
  resto.forEach((punto, i) => {
    const siguiente = resto[i + 1]
    const anterior = i === 0 ? primero : resto[i - 1]
    if (!siguiente || !anterior) {
      d += ` L ${String(punto.x)} ${String(punto.y)}`
      return
    }
    const hacia = (desde: Punto, hasta: Punto) => {
      const largo = Math.hypot(hasta.x - desde.x, hasta.y - desde.y) || 1
      const r = Math.min(RADIO, largo / 2)
      return {
        x: desde.x + ((hasta.x - desde.x) / largo) * r,
        y: desde.y + ((hasta.y - desde.y) / largo) * r,
      }
    }
    const entrada = hacia(punto, anterior)
    const salida = hacia(punto, siguiente)
    d += ` L ${String(entrada.x)} ${String(entrada.y)} Q ${String(punto.x)} ${String(punto.y)} ${String(salida.x)} ${String(salida.y)}`
  })
  return d
}

// El trazo por donde están ahora las dos cajas (también mientras se arrastra una): la ruta del acomodo llevada a sus posiciones.
function useTrazo(source: string, target: string, data: Flecha['data']): TrazoDeSalida | null {
  const de = useInternalNode(source)?.internals.positionAbsolute
  const a = useInternalNode(target)?.internals.positionAbsolute
  const { medidas } = useLienzo()
  if (!data) return null
  if (!de || !a) return data.flecha
  return trazarSalida(de, a, data.flecha.ruta, medidas)
}

// Una salida en el diagrama: el camino de su ruta (no el de los `<Handle>`), con una zona de toque ancha, la flecha cerrada y, en la etiqueta, un botón
// «Salida de «X» a «Y»» con la acción (recortada, entera en el `title` y en su descripción). Tocarla abre la salida en el inspector de su fase de origen;
// Supr o Retroceso pide quitarla (con la confirmación de siempre). Punteada si va a una fase jubilada; con ícono y texto para el lector si «Revisar» la
// señala. Más fuerte si sale de la fase abierta.
export function FlechaDeSalida({ id, source, target, data, markerEnd }: EdgeProps<Flecha>) {
  const trazo = useTrazo(source, target, data)
  const { salidas } = useLienzo()
  const idDeLaAccion = useId()
  if (!data || !trazo) return null
  const { accion, nombreDe, nombreA, haciaJubilada, marcas, resaltada } = data
  const avisos = resumenDeMarcas(marcas)
  const d = camino(trazo.puntos)
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="react-flow__edge-interaction"
      />
      <path
        d={d}
        data-salida-id={id}
        fill="none"
        markerEnd={markerEnd}
        className="react-flow__edge-path"
        style={{
          stroke: avisos
            ? 'var(--color-aviso-ink)'
            : resaltada
              ? 'var(--color-primario)'
              : 'var(--color-ink-soft)',
          strokeWidth: resaltada ? 2.5 : 1.5,
          strokeDasharray: haciaJubilada ? '6 4' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          title={accion}
          aria-label={`Salida de «${nombreDe}» a «${nombreA}»`}
          aria-describedby={idDeLaAccion}
          data-etiqueta-de-salida={id}
          disabled={salidas === null}
          onClick={() => {
            salidas?.abrir(id, source)
          }}
          onKeyDown={(evento) => {
            if (salidas === null || (evento.key !== 'Delete' && evento.key !== 'Backspace')) return
            evento.preventDefault()
            salidas.quitar(id, source)
          }}
          style={{
            transform: `translate(-50%, -50%) translate(${String(trazo.etiqueta.x)}px, ${String(trazo.etiqueta.y)}px)`,
          }}
          className={cn(
            'nodrag nopan pointer-events-auto absolute flex max-w-[9rem] cursor-pointer items-center gap-1 rounded-(--radius-sm) border border-(--color-line) bg-(--color-surface) px-1.5 text-(length:--text-xs) text-(--color-ink-soft) transition outline-none hover:border-(--color-line-strong) focus-visible:shadow-(--shadow-focus) disabled:cursor-default',
            resaltada && 'border-(--color-primario) text-(--color-ink)',
          )}
        >
          {avisos ? (
            <>
              <TriangleAlertIcon aria-hidden className="size-3 shrink-0 text-(--color-aviso-ink)" />
              <span className="sr-only">{`${avisos.texto} de Revisar: `}</span>
            </>
          ) : null}
          <span id={idDeLaAccion} className="truncate">
            {accion}
          </span>
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
