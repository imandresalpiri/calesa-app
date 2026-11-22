'use client'

import { Settings2Icon } from 'lucide-react'
import { useId, type Ref } from 'react'
import { COLUMNAS_DE_LA_SECCION } from './clases-de-la-rejilla'

type Props = {
  // Los títulos de las secciones que esconde, ya unidos.
  titulos: string
  // Alguna celda de lo que esconde tiene un aviso: se dice con texto, nunca sólo con color.
  porRevisar: boolean
  alAbrir: () => void
  boton: Ref<HTMLButtonElement>
}

export const AVISO_POR_REVISAR = 'Hay datos por revisar.'

// El botón «Avanzado» (paso 4.13-4a), como el de V1: a lo ancho de la rejilla, centrado, con los reguladores (el ícono del ⚙ de la cabecera, que ya viaja)
// y su nombre. Va en el lugar de la primera sección avanzada. Qué hay detrás (los títulos) es su descripción, sin escribirse; «Hay datos por revisar.» sí se
// escribe: es un estado. Lo que abre es un modal con su URL (`ModalDeAvanzado`).
export function BotonDeAvanzado({ titulos, porRevisar, alAbrir, boton }: Props) {
  const id = useId()
  const idDeLosTitulos = `${id}t`
  const idDelAviso = `${id}a`
  const describe = [titulos === '' ? null : idDeLosTitulos, porRevisar ? idDelAviso : null]
    .filter((x) => x !== null)
    .join(' ')
  return (
    <div data-avanzado="" className={`${COLUMNAS_DE_LA_SECCION[12]} min-w-0`}>
      <button
        ref={boton}
        type="button"
        onClick={alAbrir}
        aria-describedby={describe === '' ? undefined : describe}
        className="flex min-h-[44px] w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4 py-3 text-(length:--text-base) font-semibold text-(--color-ink) transition outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus)"
      >
        <Settings2Icon aria-hidden className="size-4 shrink-0" />
        <span>Avanzado</span>
        {titulos === '' ? null : (
          <span id={idDeLosTitulos} hidden>
            {titulos}
          </span>
        )}
        {porRevisar ? (
          <span
            id={idDelAviso}
            className="basis-full text-center text-(length:--text-sm) font-normal text-(--color-ink)"
          >
            {AVISO_POR_REVISAR}
          </span>
        ) : null}
      </button>
    </div>
  )
}
