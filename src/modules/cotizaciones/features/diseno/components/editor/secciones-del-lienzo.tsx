'use client'

import { SortableContext } from '@dnd-kit/sortable'
import type { SeccionDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import {
  CONTENEDOR_DE_SECCIONES,
  REJILLA_DE_SECCIONES,
} from '../../../hoja/components/clases-de-la-rejilla'
import { idDeLaSeccion, type IdsDelLienzo } from '../../hooks/ids-del-lienzo'
import { vecinaDeLaSeccion, type ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import type { EditorDelDiseno } from '../../hooks/use-editor-del-diseno'
import type { MarcaDeSoltar } from './marca-de-soltar'
import { SeccionEnElLienzo } from './seccion-en-el-lienzo'

// Dónde cae la sección que se arrastra sobre otra: después si viene de antes, antes si viene de después.
function marcaDeLaSeccion(
  secciones: readonly SeccionDelLienzo[],
  activo: string | null,
  sobre: string | null,
  id: string,
): MarcaDeSoltar {
  if (activo === null || sobre !== idDeLaSeccion(id) || activo === sobre) return null
  const indice = (x: string) => secciones.findIndex((s) => idDeLaSeccion(s.id) === x)
  return indice(activo) < indice(sobre) ? 'despues' : 'antes'
}

export type PropsDeLasSecciones = {
  secciones: readonly SeccionDelLienzo[]
  ids: IdsDelLienzo
  sobre: string | null
  activo: string | null
  apoyo: ApoyoDelLienzo
  editor: EditorDelDiseno
}

// Las secciones del lienzo: las principales en la rejilla de la hoja y, aparte, las que van detrás de «Avanzado». Una sola lista ordenable: el orden es el del
// diseño.
export function SeccionesDelLienzo({
  secciones,
  ids,
  sobre,
  activo,
  apoyo,
  editor,
}: PropsDeLasSecciones) {
  const dibujar = (s: SeccionDelLienzo) => (
    <SeccionEnElLienzo
      key={s.id}
      seccion={s}
      ids={ids.porSeccion.get(s.id) ?? []}
      puedeMoverse={{
        antes: vecinaDeLaSeccion(editor.trabajo, s.id, -1) !== null,
        despues: vecinaDeLaSeccion(editor.trabajo, s.id, 1) !== null,
      }}
      marca={marcaDeLaSeccion(secciones, activo, sobre, s.id)}
      apoyo={apoyo}
    />
  )
  const avanzadas = secciones.filter((s) => s.presentacion === 'avanzado')
  return (
    <SortableContext items={secciones.map((s) => idDeLaSeccion(s.id))}>
      <div data-secciones="" className={CONTENEDOR_DE_SECCIONES}>
        <div className={REJILLA_DE_SECCIONES}>
          {secciones.filter((s) => s.presentacion === 'principal').map(dibujar)}
        </div>
      </div>
      {avanzadas.length === 0 ? null : (
        <div
          data-avanzadas=""
          className="grid min-w-0 gap-3 rounded-(--radius-card) border border-dashed border-(--color-line-strong) p-3"
        >
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Detrás del botón «Avanzado» de la hoja:
          </p>
          {avanzadas.map(dibujar)}
        </div>
      )}
    </SortableContext>
  )
}
