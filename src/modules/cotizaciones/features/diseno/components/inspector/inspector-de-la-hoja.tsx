'use client'

import { XIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { ClaveDePieza } from '../../../../entities/diseno'
import type { FilaSinLugar } from '../../../../entities/diseno/sin-lugar'
import { textoDeLaPieza, type PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import { enfocarLaPieza } from '../../hooks/use-apoyo-del-lienzo'
import type { ApoyoDelInspector } from './apoyo-del-inspector'
import { AvisoDeNivel } from './aviso-de-nivel'
import { PiezaDelInspector } from './pieza-del-inspector'
import { SinLugarEnLaHoja } from './sin-lugar-en-la-hoja'
import { tituloDelInspector } from './titulo-del-inspector'

export const ETIQUETA_DEL_INSPECTOR = 'Inspector de la hoja'
export const CERRAR_EL_INSPECTOR = 'Cerrar el inspector'

type Props = {
  elegida: PiezaDeLaHoja | null
  apoyo: ApoyoDelInspector
  sinLugar: readonly FilaSinLugar[]
  elegir: (pieza: PiezaDeLaHoja | null) => void
  alQuitar: (clave: ClaveDePieza) => void
  alUbicarElTotal: () => void
  alAgregar: (fila: FilaSinLugar) => void
}

// El inspector de la hoja (docs/GLOSARIO.md): a la derecha del lienzo, no modal. Con una pieza elegida, su título, «×» (y Esc) que lo cierra y devuelve el foco a
// la pieza, el aviso del nivel si se movió y sus campos. Sin nada elegido, «Sin lugar en la hoja (N)».
export function InspectorDeLaHoja({
  elegida,
  apoyo,
  sinLugar,
  elegir,
  alQuitar,
  alUbicarElTotal,
  alAgregar,
}: Props) {
  if (elegida === null) {
    return (
      <aside
        aria-label={ETIQUETA_DEL_INSPECTOR}
        data-inspector-de-la-hoja=""
        className="@container grid min-w-0 content-start gap-3"
      >
        <SinLugarEnLaHoja filas={sinLugar} editor={apoyo.editor} alAgregar={alAgregar} />
      </aside>
    )
  }
  const { trabajo, nombresDeNodos } = apoyo.editor
  const titulo = tituloDelInspector(elegida, trabajo, nombresDeNodos)
  const cerrar = () => {
    enfocarLaPieza(textoDeLaPieza(elegida))
    elegir(null)
  }
  return (
    <aside
      aria-labelledby="titulo-del-inspector"
      data-inspector-de-la-hoja=""
      data-pieza={textoDeLaPieza(elegida)}
      className="@container grid min-w-0 content-start gap-3 rounded-(--radius-lg) border border-(--color-line-strong) bg-(--color-surface) p-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.preventDefault()
          cerrar()
        }
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <h3
          id="titulo-del-inspector"
          className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)"
        >
          {titulo}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={CERRAR_EL_INSPECTOR}
          onClick={cerrar}
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      <AvisoDeNivel editor={apoyo.editor} elegida={elegida} />
      <PiezaDelInspector
        key={textoDeLaPieza(elegida)}
        pieza={elegida}
        apoyo={apoyo}
        alQuitar={alQuitar}
        alUbicarElTotal={alUbicarElTotal}
      />
    </aside>
  )
}
