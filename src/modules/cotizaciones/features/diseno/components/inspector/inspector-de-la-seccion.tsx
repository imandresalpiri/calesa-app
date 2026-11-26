'use client'

import type { SeccionDeDiseno } from '../../../../entities/diseno'
import { seccionAdmiteNivel } from '../../../../entities/diseno/admite-nivel'
import { CamposDelAspectoDeLaSeccion } from '../aspecto'
import { CamposDeLaSeccion } from '../campos-de-la-seccion'
import { NuevoColorDeLaSeccion } from '../nuevo-color/nuevo-color-de-la-seccion'
import { errorDelAspecto, lugarEnElInspector, type ApoyoDelInspector } from './apoyo-del-inspector'

type Props = { seccion: SeccionDeDiseno; apoyo: ApoyoDelInspector }

// La sección elegida: su título, dónde va (principal o detrás de «Avanzado»), quién la ve y quién la edita, y su aspecto (su lugar en la rejilla, color, relleno…). Sus
// piezas se eligen en el lienzo. Con permiso, «+ Nuevo nivel» y, bajo el color, «+ Nuevo color»: lo creado queda elegido.
export function InspectorDeLaSeccion({ seccion, apoyo }: Props) {
  const { editor, ediciones } = apoyo
  const admite = seccionAdmiteNivel(seccion, editor.nodos)
  const error = errorDelAspecto(editor, { pieza: 'seccion', seccion: seccion.id })
  const pieza = { pieza: 'seccion', seccion: seccion.id } as const
  return (
    <div className="grid min-w-0 gap-3">
      <CamposDeLaSeccion
        seccion={seccion}
        niveles={apoyo.niveles}
        admite={admite}
        ocupado={editor.ocupado}
        alPonerSeccion={(cambios) => {
          ediciones.ponerSeccion(seccion.id, cambios)
        }}
        alPonerNiveles={(cambios) => {
          ediciones.ponerNiveles(seccion.id, undefined, cambios)
        }}
      />
      {apoyo.nuevoNivel?.((nivel) => {
        ediciones.ponerNiveles(seccion.id, undefined, admite ? { ver: nivel } : { editar: nivel })
      }) ?? null}
      <div data-aspecto-de-la-seccion="">
        <CamposDelAspectoDeLaSeccion
          seccion={seccion}
          lugar={lugarEnElInspector(apoyo, pieza, `${seccion.id}-aspecto`, error)}
          catalogo={apoyo.catalogo}
          colores={apoyo.colores}
          ocupado={editor.ocupado}
          error={error}
          alPoner={(cambios) => {
            ediciones.ponerAspectoDeSeccion(seccion.id, cambios)
          }}
          bajoElColor={
            apoyo.alCrearColor === null || apoyo.catalogo === null ? null : (
              <NuevoColorDeLaSeccion
                catalogo={apoyo.catalogo}
                idDelSelector={`${seccion.id}-aspecto-tono`}
                ocupado={editor.ocupado}
                alCrear={(color) => {
                  apoyo.alCrearColor?.(color)
                  ediciones.ponerAspectoDeSeccion(seccion.id, { tono: color.clave })
                }}
              />
            )
          }
        />
      </div>
    </div>
  )
}
