'use client'

import type { NodeProps } from '@xyflow/react'
import { useId } from 'react'
import { cn } from 'cn'
import { Badge } from '@/shared/ui/badge'
import { pasoDeTeclado } from '../../../../entities/posiciones-del-diagrama'
import { POR_NIVEL_DE_MARCA } from '../marcas-de-la-fase'
import { AsaDeLaFase } from './asa-de-la-fase'
import { useLienzo } from './contexto-del-lienzo'
import type { NodoDeFase as Nodo } from './datos-del-diagrama'

// Una fase en el diagrama: un botón que abre su panel (no abre si viene de arrastrarla), con el borde del color de la fase, su nombre, sus marcas, sus
// requisitos y quién la mueve en corto, y el ícono con sus avisos de «Revisar». Lo demás, para el lector, en su descripción. Una jubilada va apagada y
// punteada. Con el foco, las flechas del teclado la mueven (1 rem; 10 con Shift). El asa es hermana del botón: nada interactivo dentro de otro.
export function NodoDeFase({ data, dragging }: NodeProps<Nodo>) {
  const { medidas, alAbrir, vieneDeArrastrar, puedeMover, puedeVincular, alTeclado } = useLienzo()
  const idDeLaDescripcion = useId()
  const { fase, marcas, requisitos, quienMueve, avisos, descripcion, abierta } = data
  const nivel = avisos ? POR_NIVEL_DE_MARCA[avisos.nivel] : null
  return (
    <>
      <AsaDeLaFase lado="destino" nombre={fase.nombre} puedeVincular={puedeVincular} />
      <button
        type="button"
        data-fase-id={fase.id}
        aria-label={`Fase «${fase.nombre}»`}
        aria-describedby={idDeLaDescripcion}
        aria-current={abierta ? 'true' : undefined}
        onClick={() => {
          if (!vieneDeArrastrar()) alAbrir(fase.id)
        }}
        onKeyDown={(evento) => {
          const paso = pasoDeTeclado(evento.key, evento.shiftKey)
          if (!paso || !puedeMover) return
          evento.preventDefault()
          alTeclado(fase.id, paso)
        }}
        style={{ width: medidas.ancho, height: medidas.alto, borderLeftColor: fase.color }}
        className={cn(
          'flex cursor-pointer flex-col items-start gap-1 overflow-hidden rounded-(--radius-card) border border-l-[0.375rem] border-(--color-line-strong) bg-(--color-surface) p-3 text-left shadow-(--shadow-sm) transition outline-none focus-visible:shadow-(--shadow-focus)',
          !fase.activa && 'border-dashed opacity-70',
          abierta && 'ring-2 ring-(--color-primario)',
          dragging && 'cursor-grabbing shadow-(--shadow-lg)',
        )}
      >
        <span className="flex w-full min-w-0 items-start justify-between gap-2">
          <span className="line-clamp-2 min-w-0 text-(length:--text-sm) font-medium text-(--color-ink)">
            {fase.nombre}
          </span>
          {avisos && nivel ? (
            <span
              aria-hidden
              className={cn(
                'flex shrink-0 items-center gap-0.5 rounded-(--radius-pill) px-1.5 text-(length:--text-xs) font-medium',
                nivel.clases,
              )}
            >
              <nivel.Icono className="size-3.5" />
              {avisos.cuantos}
            </span>
          ) : null}
        </span>
        {marcas.length > 0 ? (
          <span className="flex min-w-0 flex-wrap gap-1">
            {marcas.map((marca) => (
              <Badge key={marca} variant="secondary">
                {marca}
              </Badge>
            ))}
          </span>
        ) : null}
        <span className="w-full truncate text-(length:--text-xs) text-(--color-ink-soft)">
          {requisitos}
        </span>
        <span className="w-full truncate text-(length:--text-xs) text-(--color-ink-soft)">
          {quienMueve}
        </span>
        <span id={idDeLaDescripcion} className="sr-only">
          {descripcion}
        </span>
      </button>
      <AsaDeLaFase lado="asa" nombre={fase.nombre} puedeVincular={puedeVincular} />
    </>
  )
}
