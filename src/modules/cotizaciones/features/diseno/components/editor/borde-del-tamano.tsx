'use client'

import { COLUMNAS_DE_LA_REJILLA } from '../../../../entities/diseno'
import { textoDeLasColumnas } from '../../../../entities/diseno/ancho-de-la-pieza'
import { enFilas } from '../../../../entities/diseno/anuncios-del-tamano'
import type { Tamano } from '../../../../entities/diseno/lugar-en-la-rejilla'
import type { PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import type { PiezaEnLaRejilla } from '../../../../entities/rejilla-de-la-hoja'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { useTamanoConBorde, type LadoDelBorde } from '../../hooks/use-tamano-con-borde'

type Props = {
  nombre: string
  lado: LadoDelBorde
  lugar: PiezaEnLaRejilla
  ocupado: boolean
  topar: (pedido: Partial<Tamano>) => Tamano | null
  alCambiar: (pedido: Partial<Tamano>) => void
}

const rotulo = (lado: LadoDelBorde, nombre: string, t: Tamano) =>
  lado === 'derecho'
    ? `Ancho de ${nombre}: ${String(t.ancho)} de ${String(COLUMNAS_DE_LA_REJILLA)} columnas`
    : `Alto de ${nombre}: ${enFilas(t.alto)}`

const loQueMide = (lado: LadoDelBorde, t: Tamano) =>
  lado === 'derecho' ? textoDeLasColumnas(t.ancho) : enFilas(t.alto)

// Cada borde con un blanco de 44 px sobre su lado: el derecho a todo el alto; el inferior junto a la esquina de la izquierda, lejos del «+» del centro.
const CLASES: Readonly<Record<LadoDelBorde, { boton: string; tirador: string; medida: string }>> = {
  derecho: {
    boton: 'inset-y-0 -right-[22px] w-[44px] cursor-ew-resize',
    tirador: 'h-8 w-1.5 group-hover:h-10',
    medida: '-top-7',
  },
  inferior: {
    boton: '-bottom-[22px] left-0 h-[44px] w-[44px] cursor-ns-resize',
    tirador: 'h-1.5 w-8 group-hover:w-10',
    medida: 'left-full ml-1',
  },
}

// Un borde de la pieza elegida (el derecho, el ancho en columnas; el inferior, el alto en filas): se arrastra y, mientras, se ve lo que quedaría («6/12»,
// «2 filas»).
function BordeDelTamano({ nombre, lado, lugar, ocupado, topar, alCambiar }: Props) {
  const borde = useTamanoConBorde(lado, lugar, { topar, alCambiar })
  const clases = CLASES[lado]
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={rotulo(lado, nombre, lugar)}
      data-borde-del-tamano={lado}
      disabled={ocupado}
      onPointerDown={borde.alBajar}
      onPointerMove={borde.alMover}
      onPointerUp={borde.alSubir}
      onPointerCancel={borde.cancelar}
      onKeyDown={borde.alTeclear}
      className={`group absolute z-20 flex touch-none items-center justify-center outline-none disabled:cursor-wait ${clases.boton}`}
    >
      <span aria-hidden className={`rounded-full bg-(--color-accent) ${clases.tirador}`} />
      {borde.tamano === null ? null : (
        <span
          role="status"
          data-tamano-del-borde=""
          className={`absolute rounded-(--radius-sm) bg-(--color-ink) px-1.5 py-0.5 text-(length:--text-xs) whitespace-nowrap text-(--color-paper) tabular-nums ${clases.medida}`}
        >
          {loQueMide(lado, borde.tamano)}
        </span>
      )}
    </button>
  )
}

// Los dos bordes de la pieza elegida sobre su lugar de la rejilla: el que cambia su ancho y el que cambia su alto, hasta donde entra (lo dice el anuncio). Fuera
// del orden del Tab: con el teclado, Alt+Shift+flechas sobre la pieza.
export function BordesDelTamano({
  pieza,
  nombre,
  apoyo,
}: {
  pieza: PiezaDeLaHoja
  nombre: string
  apoyo: ApoyoDelLienzo
}) {
  const lugar = apoyo.lugarDe(pieza)
  if (lugar === null) return null
  const comun = {
    nombre,
    lugar,
    ocupado: apoyo.ocupado,
    topar: (pedido: Partial<Tamano>) => apoyo.tamanoQueEntra(pieza, pedido),
    alCambiar: (pedido: Partial<Tamano>) => {
      apoyo.cambiarTamano(pieza, pedido)
    },
  }
  return (
    <>
      <BordeDelTamano lado="derecho" {...comun} />
      <BordeDelTamano lado="inferior" {...comun} />
    </>
  )
}
