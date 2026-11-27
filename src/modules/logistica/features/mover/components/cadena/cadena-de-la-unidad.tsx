'use client'

import { useEffect, useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import {
  AVISO_SIN_CAMINO,
  AVISO_SIN_PASADAS,
  type CadenaDeLaUnidad,
} from '../../../../entities/mover/cadena'
import { nodoVisto } from '../../../../entities/mover/fase-vista'
import { abrirHueco } from '../../../nucleo/hooks/eventos-de-la-unidad'
import { useFaseVista } from '../../hooks/use-fase-vista'
import { NodoDeLaCadenaDeLaUnidad } from './nodo-de-la-cadena'
import { useTecladoDeLaCadena } from './use-teclado-de-la-cadena'

const SEPARADOR = <span aria-hidden className="h-px w-3 shrink-0 bg-(--color-line)" />

// Lleva el nodo al centro de la cadena desplazando sólo la cadena (`scrollIntoView` movería también la página).
export function centrarEnLaCadena(lista: HTMLElement, clave: string) {
  const nodo = lista.querySelector<HTMLElement>(`[data-nodo="${CSS.escape(clave)}"]`)
  if (!nodo) return
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  lista.scrollTo({
    left: nodo.offsetLeft - (lista.clientWidth - nodo.offsetWidth) / 2,
    behavior: reducido ? 'auto' : 'smooth',
  })
}

// La cadena de la unidad (`docs/GLOSARIO.md` › «Cadena de la unidad»): de izquierda a derecha, las fases por las que pasó, la actual (al centro al llegar) y las que le faltan por el
// camino principal. Tocar una la elige (`?fase_vista=`) y «Qué falta» muestra esa fase. Alto fijo; si no cabe, se desplaza de costado con la pista de que sigue. Si el tope de
// pasadas cortó, va primero «Cambios anteriores», que abre la tarjeta Historial. Lo que no se pudo leer se dice al final, sin romper la fila.
export function CadenaDeLaUnidadEnLaPagina({ cadena }: { cadena: CadenaDeLaUnidad }) {
  const lista = useRef<HTMLOListElement>(null)
  const desborde = useDesborde(lista)
  const alTeclear = useTecladoDeLaCadena(lista)
  const [clave, elegir] = useFaseVista()
  const visto = nodoVisto(clave, cadena.nodos)
  const actual = cadena.nodos.find((n) => n.tipo === 'actual')
  const claveVista = visto?.clave ?? actual?.clave ?? null
  const aviso = [
    cadena.sinCamino ? AVISO_SIN_CAMINO : null,
    cadena.sinPasadas ? AVISO_SIN_PASADAS : null,
  ]
    .filter((t) => t !== null)
    .join(' ')
  // Una fase vista que no es de la cadena (otro flujo, una URL vieja) o que ya es la actual (se movió ahí) se ignora y se limpia de la URL, sin redirigir.
  const sobra = clave !== null && visto === null
  useEffect(() => {
    if (sobra) elegir(null)
  }, [sobra, elegir])
  // Sólo al llegar: después, elegir no mueve la cadena bajo el dedo.
  const alLlegar = useRef(claveVista)
  useEffect(() => {
    if (lista.current && alLlegar.current) centrarEnLaCadena(lista.current, alLlegar.current)
  }, [])
  return (
    <nav
      aria-label="Cadena de la unidad"
      className="relative h-14 min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
    >
      <ol
        ref={lista}
        onKeyDown={alTeclear}
        className="flex h-full items-center overflow-x-auto overflow-y-hidden px-3"
      >
        {cadena.hayAnteriores ? (
          <li className="flex shrink-0 items-center">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                abrirHueco('historial')
              }}
              className="flex h-9 shrink-0 items-center rounded-full px-3 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
            >
              Cambios anteriores
            </button>
            {SEPARADOR}
          </li>
        ) : null}
        {cadena.nodos.map((nodo, i) => (
          <li key={nodo.clave} className="flex shrink-0 items-center">
            {i > 0 ? SEPARADOR : null}
            <NodoDeLaCadenaDeLaUnidad
              nodo={nodo}
              vista={nodo.clave === claveVista}
              enfocable={nodo.clave === claveVista}
              elegir={() => {
                elegir(nodo.tipo === 'actual' ? null : nodo.clave)
              }}
            />
          </li>
        ))}
        {aviso ? (
          <li className="ms-3 shrink-0 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft)">
            {aviso}
          </li>
        ) : null}
      </ol>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
