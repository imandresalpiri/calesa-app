'use client'

import { Bloque } from '@/shared/ui/bloque'
import { COLUMNAS_DE_LA_REJILLA, type ItemDeDiseno } from '../../../../entities/diseno'
import type { CambioDeAspectoDeItem } from '../../../../entities/diseno/edicion-del-aspecto'
import { altoSirve, columnasDeLaCelda } from '../../../../entities/rejilla-de-la-hoja'
import {
  ALTO_SIN_EFECTO,
  altoElegido,
  errorDe,
  OPCIONES_DE_FILAS,
  valorDelAlto,
  type ErrorDelAspecto,
} from './etiquetas-del-aspecto'
import { CamposDeEscala } from './campos-de-escala'
import { camposDeTexto } from './campos-de-texto'
import { SelectorDeColumnas } from './selector-de-columnas'

type Props = {
  // El prefijo de los nombres de sus campos (`<sección>__<nodo>`).
  base: string
  item: ItemDeDiseno
  ocupado: boolean
  error: ErrorDelAspecto
  alPoner: (cambios: CambioDeAspectoDeItem) => void
}

// El aspecto de un ítem, a la vista: su alto, su letra y su énfasis; los que no son celda, también su ancho (la celda lo tiene a la vista).
export function CamposDelAspectoDelItem({ base, item, ocupado, error, alPoner }: Props) {
  const columnas =
    item.tipo === 'celda' ? columnasDeLaCelda(item.ancho) : (item.ancho ?? COLUMNAS_DE_LA_REJILLA)
  const sinAlto = !altoSirve(columnas)
  return (
    <Bloque titulo="Aspecto" className="mt-2">
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        {item.tipo === 'celda' ? null : (
          <SelectorDeColumnas
            nombre={`${base}-ancho`}
            etiqueta="Ancho"
            valor={columnas}
            ocupado={ocupado}
            error={errorDe(error, 'ancho')}
            alCambiar={(ancho) => {
              alPoner({ ancho })
            }}
          />
        )}
        <CamposDeEscala
          base={base}
          ocupado={ocupado}
          campos={[
            {
              clave: 'alto',
              etiqueta: 'Alto',
              opciones: OPCIONES_DE_FILAS,
              valor: valorDelAlto(item.alto),
              apagado: sinAlto ? ALTO_SIN_EFECTO : undefined,
              error: errorDe(error, 'alto'),
              alElegir: (v) => {
                alPoner({ alto: altoElegido(v) })
              },
            },
            ...camposDeTexto(item, alPoner),
          ]}
        />
      </div>
    </Bloque>
  )
}
