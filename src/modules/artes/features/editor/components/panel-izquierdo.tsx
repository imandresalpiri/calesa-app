'use client'

import { useId, type KeyboardEvent } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  PESTANAS_DEL_PANEL_IZQUIERDO,
  TITULOS_DEL_PANEL_IZQUIERDO,
  type PestanaIzquierda,
} from '../../../entities/editor/paneles'
import type { PropsDelPanelIzquierdo } from '../tipos'
import { PestanaAgregar } from './agregar'
import { PestanaCapas } from './capas'

const FLECHAS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

// El panel izquierdo del editor de artes: 18 rem de ancho y todo el alto, con sus pestañas «Agregar» y «Capas» en una fila de 40 px; lo de
// cada pestaña se desplaza adentro y el panel nunca cambia de tamaño. «Agregar» queda montada desde la primera vez que se ve (la biblioteca
// no se vuelve a leer al ir y volver); «Capas», sólo mientras se ve (se dibuja con cada cambio del documento). Con el teclado, ← y → cambian
// de pestaña; la flecha llega a los atajos del editor con `defaultPrevented`.
export function PanelIzquierdo(props: PropsDelPanelIzquierdo) {
  const { editor, logos, pestana, alCambiarPestana } = props
  const base = useId()
  const agregarVista = useAbiertoAlgunaVez(pestana === 'agregar')
  const idDe = (p: PestanaIzquierda, que: 'pestana' | 'panel') => `${base}-${que}-${p}`

  function alTeclear(evento: KeyboardEvent<HTMLButtonElement>) {
    const paso = FLECHAS[evento.key]
    if (paso === undefined) {
      return
    }
    evento.preventDefault()
    const i = PESTANAS_DEL_PANEL_IZQUIERDO.indexOf(pestana)
    const total = PESTANAS_DEL_PANEL_IZQUIERDO.length
    const otra = PESTANAS_DEL_PANEL_IZQUIERDO[(i + paso + total) % total] ?? pestana
    alCambiarPestana(otra)
    document.getElementById(idDe(otra, 'pestana'))?.focus()
  }

  return (
    <aside aria-label="Agregar y capas" className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div
        role="tablist"
        aria-label="Panel izquierdo"
        className="flex h-10 shrink-0 items-stretch gap-1 border-b border-(--color-line) px-2"
      >
        {PESTANAS_DEL_PANEL_IZQUIERDO.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={idDe(p, 'pestana')}
            aria-selected={p === pestana}
            aria-controls={idDe(p, 'panel')}
            tabIndex={p === pestana ? 0 : -1}
            onClick={() => {
              alCambiarPestana(p)
            }}
            onKeyDown={alTeclear}
            className="relative inline-flex items-center px-2 text-(length:--text-sm) font-medium text-(--color-ink-soft) transition outline-none after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-selected:text-(--color-ink) aria-selected:after:bg-(--color-primario)"
          >
            {TITULOS_DEL_PANEL_IZQUIERDO[p]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={idDe('agregar', 'panel')}
        aria-labelledby={idDe('agregar', 'pestana')}
        hidden={pestana !== 'agregar'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {agregarVista ? (
          <PestanaAgregar
            editor={editor}
            logos={logos}
            alAgregar={props.alAgregar}
            pedidoDeLaBiblioteca={props.pedidoDeLaBiblioteca}
          />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id={idDe('capas', 'panel')}
        aria-labelledby={idDe('capas', 'pestana')}
        hidden={pestana !== 'capas'}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {pestana === 'capas' ? <PestanaCapas editor={editor} logos={logos} /> : null}
      </div>
    </aside>
  )
}
