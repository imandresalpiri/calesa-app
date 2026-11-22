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
import { altoSirve, SECCION_AUTOMATICA } from '../../../../entities/rejilla-de-la-hoja'
import {
  ALTO_SIN_EFECTO,
  altoElegido,
  errorDe,
  OPCIONES_DE_DENSIDAD,
  OPCIONES_DE_FILAS,
  OPCIONES_DE_RELLENO,
  OPCIONES_DE_SEPARACION,
  valorDelAlto,
  type ErrorDelAspecto,
} from './etiquetas-del-aspecto'
import { CamposDeEscala, type CampoDeEscala } from './campos-de-escala'
import { SelectorDeColumnas } from './selector-de-columnas'
import { SelectorDeTono, type TonoDelCatalogo } from './selector-de-tono'
import { camposDeTexto } from './campos-de-texto'

type Props = {
  seccion: SeccionDeDiseno
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  ocupado: boolean
  error: ErrorDelAspecto
  // Lo que va bajo el selector de color («+ Nuevo color» del editor de la hoja); nada si no se pasa.
  bajoElColor?: ReactNode
  alPoner: (cambios: CambioDeAspectoDeSeccion) => void
}

// Los selects de escala de una sección: alto, relleno, separación, densidad, letra y énfasis.
function camposDeLaSeccion(
  s: SeccionDeDiseno,
  sinAlto: boolean,
  error: ErrorDelAspecto,
  alPoner: (cambios: CambioDeAspectoDeSeccion) => void,
): CampoDeEscala[] {
  return [
    {
      clave: 'alto',
      etiqueta: 'Alto',
      opciones: OPCIONES_DE_FILAS,
      valor: valorDelAlto(s.alto),
      apagado: sinAlto ? ALTO_SIN_EFECTO : undefined,
      error: errorDe(error, 'alto'),
      alElegir: (v) => {
        alPoner({ alto: altoElegido(v) })
      },
    },
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

// El aspecto de una sección, plegado: su lugar en la rejilla de las secciones, sus espacios, su letra y su color.
export function CamposDelAspectoDeLaSeccion({
  seccion: s,
  catalogo,
  colores,
  ocupado,
  error,
  alPoner,
  bajoElColor = null,
}: Props) {
  const base = `${s.id}-aspecto`
  const columnas = s.ancho ?? SECCION_AUTOMATICA.columnas
  const sinAlto = !altoSirve(columnas)
  return (
    <Bloque titulo="Aspecto" plegado forzarAbierto={error !== null}>
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <SelectorDeColumnas
          nombre={`${base}-ancho`}
          etiqueta="Ancho en la hoja"
          valor={s.ancho ?? null}
          automatico="Automático (la mitad, si hay lugar)"
          ocupado={ocupado}
          error={errorDe(error, 'ancho')}
          alCambiar={(ancho) => {
            alPoner({ ancho })
          }}
        />
        <CamposDeEscala
          base={base}
          ocupado={ocupado}
          campos={camposDeLaSeccion(s, sinAlto, error, alPoner)}
        />
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
    </Bloque>
  )
}
