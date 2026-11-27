'use client'

import type { Grupo } from '../../../../../entities/formula'
import { MenuDeLaBanda } from '../menu/menu-de-la-banda'
import { COLUMNAS } from './clases'

type Props = {
  grupo: Grupo
  // La etiqueta de su tipo de cambio con el modo elegido.
  tipoDeCambio: string
  // El rechazo de `validarFormula()` que nombra la banda, o nulo.
  rechazo: string | null
  // Un grupo sin filas (se dibuja al final, para arreglarlo).
  vacia: boolean
  // Sin su «⋯» en sólo lectura (Modo Live).
  conMenu: boolean
  motivoParaQuitar: string | null
  alEditar: () => void
  alQuitar: () => void
}

const notaDe = (grupo: Grupo, tipoDeCambio: string) =>
  [grupo.plazo === undefined ? null : `Plazo: ${grupo.plazo}`, `Tipo de cambio: ${tipoDeCambio}`]
    .filter((x) => x !== null)
    .join(' · ')

// La cabecera de un tramo de banda (D1, D13): sin número, en una línea (la muestra del color, la etiqueta, el plazo, el tipo de cambio y su «⋯»; lo largo se
// recorta con su `title`), pegada a la izquierda al desplazarse de costado y nunca más ancha que el marco. En un marco angosto (o al 200 %) se parte en dos.
export function CabeceraDeLaBanda(p: Props) {
  const { grupo } = p
  const nota = notaDe(grupo, p.tipoDeCambio)
  return (
    <tr data-banda={grupo.id}>
      <td
        colSpan={COLUMNAS}
        className="border-y border-[color:var(--tono-borde,var(--color-line))] bg-[color:var(--tono-fondo,var(--color-surface-2))] p-0 text-left text-[color:var(--tono-tinta,var(--color-ink))]"
      >
        <div className="sticky left-0 flex max-w-[100cqw] flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1 @md/planilla:flex-nowrap">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border border-[color:var(--tono-tinta,var(--color-ink-soft))] bg-[color:var(--tono-borde,var(--color-line-strong))]"
          />
          <span title={grupo.etiqueta} className="min-w-0 font-semibold @md/planilla:truncate">
            {grupo.etiqueta}
          </span>
          <span title={nota} className="min-w-0 text-(length:--text-xs) @md/planilla:truncate">
            {nota}
          </span>
          {p.vacia ? (
            <span className="shrink-0 text-(length:--text-xs)">Esta banda no tiene filas.</span>
          ) : null}
          {p.conMenu ? (
            <MenuDeLaBanda
              etiqueta={grupo.etiqueta}
              motivoParaQuitar={p.motivoParaQuitar}
              alEditar={p.alEditar}
              alQuitar={p.alQuitar}
            />
          ) : null}
        </div>
        {p.rechazo === null ? null : (
          <p
            role="alert"
            className="sticky left-0 max-w-[100cqw] bg-(--color-aviso-soft) px-2 py-1.5 text-(--color-aviso-ink)"
          >
            {p.rechazo}
          </p>
        )}
      </td>
    </tr>
  )
}
