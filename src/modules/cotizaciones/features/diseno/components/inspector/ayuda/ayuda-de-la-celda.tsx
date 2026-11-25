'use client'

import { useMemo, useState } from 'react'
import {
  useFocoTrasMover,
  type Movimiento,
} from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { ayudaEnBloques } from '../../../../../entities/ayuda-en-bloques'
import type { CeldaDeDiseno } from '../../../../../entities/diseno'
import {
  celdasQueAceptanValor,
  tablaParaElBloqueNuevo,
  tablasParaAyuda,
} from '../../../../../entities/diseno/tabla-del-bloque'
import { errorDelBloque, type ApoyoDelInspector } from '../apoyo-del-inspector'
import { BloqueDelInspector } from './bloque-del-inspector'
import { CamposDelBloque } from './campos-del-bloque'
import { SumarBloque } from './sumar-bloque'

type Props = { seccion: string; celda: CeldaDeDiseno; apoyo: ApoyoDelInspector }

export const SIN_AYUDA = 'Sin ayuda: la celda no muestra el botón «?».'

// La ayuda de la celda en el inspector (docs/UX.md › «La ayuda»): sus bloques en orden, cada uno con su «⋯» (mover y quitar) y sus campos, y «+ Bloque».
// Tras mover, el foco vuelve al «⋯» del bloque movido. La ayuda de antes (`{texto, enlaces?}` o `{tabla}`) se ve ya como bloques; se guarda así al tocarla.
export function AyudaDeLaCelda({ seccion, celda, apoyo }: Props) {
  const { editor, catalogoDeTablas } = apoyo
  const ayuda = apoyo.ediciones.ayuda
  const prefijo = `ayuda-${seccion}__${celda.nodo}`
  const bloques = ayudaEnBloques(celda.ayuda)
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)
  useFocoTrasMover(prefijo, movimiento)
  const celdas = useMemo(
    () => celdasQueAceptanValor(editor.trabajo, editor.definicion),
    [editor.trabajo, editor.definicion],
  )
  const donde = { seccion, nodo: celda.nodo }
  const error = errorDelBloque(editor, donde)
  const paraTabla = tablaParaElBloqueNuevo(
    bloques,
    catalogoDeTablas,
    tablasParaAyuda(editor.definicion),
  )
  return (
    <section aria-labelledby={`${prefijo}-titulo`} className="grid min-w-0 gap-2">
      <h4
        id={`${prefijo}-titulo`}
        className="text-(length:--text-sm) font-medium text-(--color-ink)"
      >
        Ayuda
      </h4>
      {bloques.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_AYUDA}</p>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {bloques.map((bloque, i) => {
            const enBloque = { ...donde, bloque: i }
            return (
              <BloqueDelInspector
                key={`${prefijo}-${String(i)}`}
                prefijo={prefijo}
                indice={i}
                total={bloques.length}
                tipo={bloque.tipo}
                ocupado={editor.ocupado}
                conError={error?.bloque === i}
                alMover={(destino) => {
                  ayuda.moverBloque(enBloque, destino)
                  setMovimiento((antes) => ({
                    id: String(destino),
                    direccion: destino < i ? 'subir' : 'bajar',
                    veces: (antes?.veces ?? 0) + 1,
                  }))
                }}
                alQuitar={() => {
                  ayuda.quitarBloque(enBloque, bloque)
                }}
              >
                <CamposDelBloque
                  nombre={`${prefijo}-${String(i)}`}
                  donde={enBloque}
                  bloque={bloque}
                  celdas={celdas}
                  apoyo={apoyo}
                />
              </BloqueDelInspector>
            )
          })}
        </ol>
      )}
      <SumarBloque
        ayuda={celda.ayuda}
        paraTabla={paraTabla}
        ocupado={editor.ocupado}
        alSumar={(tipo, tabla) => {
          ayuda.sumarBloque(donde, tipo, tabla)
        }}
      />
    </section>
  )
}
