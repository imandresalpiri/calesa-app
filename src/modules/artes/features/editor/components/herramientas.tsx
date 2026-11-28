'use client'

import { cn } from 'cn'
import {
  CircleIcon,
  HandIcon,
  ImageIcon,
  MousePointer2Icon,
  PenToolIcon,
  SlashIcon,
  SquareIcon,
  TriangleIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'
import { Fragment } from 'react'
import type { HerramientaDelEditor } from '../../../entities/editor/atajos'
import {
  HERRAMIENTAS_DEL_RIEL,
  letraDeLaHerramienta,
  NOMBRE_DE_LA_HERRAMIENTA,
  seUsaEnSoloLectura,
  tituloDeLaHerramienta,
} from '../../../entities/editor/herramientas'
import type { PropsDeLasHerramientas } from '../tipos'

const ICONO: Readonly<Record<HerramientaDelEditor, LucideIcon>> = {
  mover: MousePointer2Icon,
  mano: HandIcon,
  texto: TypeIcon,
  rectangulo: SquareIcon,
  elipse: CircleIcon,
  linea: SlashIcon,
  poligono: TriangleIcon,
  pluma: PenToolIcon,
  imagen: ImageIcon,
}

// Después de estas va una raya: las que miran, las que dibujan y la que trae una imagen.
const ANTES_DE_LA_RAYA: ReadonlySet<HerramientaDelEditor> = new Set(['mano', 'pluma'])

// El riel de herramientas del editor de artes: una columna de 3 rem a la izquierda del panel, un botón por herramienta con su icono, apretado
// (`aria-pressed`) el de la que está en uso y con su letra en el título («Rectángulo (R)»). En sólo lectura se usan sólo mover y mano.
// «Imagen» no dibuja: quien lo monta muestra la biblioteca en «Agregar».
export function Herramientas({ herramienta, alElegir, soloLectura }: PropsDeLasHerramientas) {
  return (
    <div
      role="group"
      aria-label="Herramientas"
      className="flex h-full w-full flex-col items-center gap-1 overflow-y-auto py-2"
    >
      {HERRAMIENTAS_DEL_RIEL.map((h) => {
        const Icono = ICONO[h]
        const apagada = soloLectura && !seUsaEnSoloLectura(h)
        return (
          <Fragment key={h}>
            <button
              type="button"
              aria-pressed={herramienta === h}
              aria-label={NOMBRE_DE_LA_HERRAMIENTA[h]}
              title={tituloDeLaHerramienta(h)}
              aria-keyshortcuts={letraDeLaHerramienta(h) ?? undefined}
              data-herramienta={h}
              disabled={apagada}
              onClick={() => {
                alElegir(h)
              }}
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-(--radius-md) text-(--color-ink-soft) transition outline-none',
                'hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus)',
                'aria-pressed:bg-(--color-primario-soft) aria-pressed:text-(--color-primario-ink)',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
              )}
            >
              <Icono aria-hidden className="size-4" />
            </button>
            {ANTES_DE_LA_RAYA.has(h) ? (
              <span aria-hidden className="my-1 h-px w-6 shrink-0 bg-(--color-line)" />
            ) : null}
          </Fragment>
        )
      })}
    </div>
  )
}
