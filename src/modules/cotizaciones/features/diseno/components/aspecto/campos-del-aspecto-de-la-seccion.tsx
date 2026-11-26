'use client'

import type { ReactNode } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import type { Tono } from '@/shared/ui/xcell'
import {
  ASPECTO_POR_DEFECTO,
  type DensidadDeSeccion,
  type Relleno,
  type SeccionDeDiseno,
  type Separacion,
} from '../../../../entities/diseno'
import type { CambioDeAspectoDeSeccion } from '../../../../entities/diseno/edicion-del-aspecto'
import {
  errorDe,
  OPCIONES_DE_DENSIDAD,
  OPCIONES_DE_RELLENO,
  OPCIONES_DE_SEPARACION,
  type ErrorDelAspecto,
} from './etiquetas-del-aspecto'
import { CamposDeEscala, type CampoDeEscala } from './campos-de-escala'
import { CamposDelLugar, type PropsDelLugar } from './campos-del-lugar'
import { SelectorDeTono, type TonoDelCatalogo } from './selector-de-tono'
import { camposDeTexto } from './campos-de-texto'

type Props = {
  seccion: SeccionDeDiseno
  // Su lugar en la rejilla de las secciones («Columna», «Fila», «Ancho», «Alto»).
  lugar: PropsDelLugar
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  ocupado: boolean
  error: ErrorDelAspecto
  // Lo que va bajo el selector de color («+ Nuevo color» del editor de la hoja); nada si no se pasa.
  bajoElColor?: ReactNode
  alPoner: (cambios: CambioDeAspectoDeSeccion) => void
}

// Los selects de escala de una sección: relleno, separación, densidad, letra y énfasis.
function camposDeLaSeccion(
  s: SeccionDeDiseno,
  alPoner: (cambios: CambioDeAspectoDeSeccion) => void,
): CampoDeEscala[] {
  return [
    {
      clave: 'relleno',
      etiqueta: 'Relleno',
      opciones: OPCIONES_DE_RELLENO,
      valor: s.relleno ?? ASPECTO_POR_DEFECTO.relleno,
      alElegir: (v) => {
        alPoner({ relleno: v as Relleno })
      },
    },
    {
      clave: 'separacion',
      etiqueta: 'Separación entre celdas',
      opciones: OPCIONES_DE_SEPARACION,
      valor: s.separacion ?? ASPECTO_POR_DEFECTO.separacion,
      alElegir: (v) => {
        alPoner({ separacion: v as Separacion })
      },
    },
    {
      clave: 'densidad',
      etiqueta: 'Densidad',
      opciones: OPCIONES_DE_DENSIDAD,
      valor: s.densidad ?? ASPECTO_POR_DEFECTO.densidad,
      alElegir: (v) => {
        alPoner({ densidad: v as DensidadDeSeccion })
      },
    },
    ...camposDeTexto(s, alPoner),
  ]
}

// El aspecto de una sección, a la vista: su lugar en la rejilla de las secciones (una avanzada, ninguno), sus espacios, su letra y su color.
export function CamposDelAspectoDeLaSeccion({
  seccion: s,
  lugar,
  catalogo,
  colores,
  ocupado,
  error,
  alPoner,
  bajoElColor = null,
}: Props) {
  const base = `${s.id}-aspecto`
  return (
    <Bloque titulo="Aspecto">
      <div className="grid min-w-0 gap-2">
        <CamposDelLugar {...lugar} automatica={s.ancho === undefined} />
        <div className="grid min-w-0 gap-2 @md:grid-cols-2">
          <CamposDeEscala base={base} ocupado={ocupado} campos={camposDeLaSeccion(s, alPoner)} />
          <SelectorDeTono
            nombre={`${base}-tono`}
            valor={s.tono}
            catalogo={catalogo}
            colores={colores}
            ocupado={ocupado}
            error={errorDe(error, 'tono')}
            alCambiar={(tono) => {
              alPoner({ tono })
            }}
          />
          {bajoElColor}
        </div>
      </div>
    </Bloque>
  )
}
