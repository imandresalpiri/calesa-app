'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { Tono } from '@/shared/ui/xcell'
import {
  ASPECTO_POR_DEFECTO,
  type CabeceraDeDiseno,
  type Relleno,
} from '../../../../entities/diseno'
import type { CambioDeAspectoDeLaCabecera } from '../../../../entities/diseno/edicion-del-aspecto'
import { errorDe, OPCIONES_DE_RELLENO, type ErrorDelAspecto } from './etiquetas-del-aspecto'
import { CamposDeEscala } from './campos-de-escala'
import { camposDeTexto } from './campos-de-texto'
import { SelectorDeTono, type TonoDelCatalogo } from './selector-de-tono'

type Props = {
  cabecera: CabeceraDeDiseno
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  ocupado: boolean
  error: ErrorDelAspecto
  alPoner: (cambios: CambioDeAspectoDeLaCabecera) => void
}

// El aspecto de la cabecera (los modos de tipo de cambio), a la vista: va sola en su fila, así que no lleva ancho ni alto. Con color o relleno es una caja.
export function CamposDelAspectoDeLaCabecera({
  cabecera,
  catalogo,
  colores,
  ocupado,
  error,
  alPoner,
}: Props) {
  return (
    <Bloque titulo="Aspecto">
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <SelectorDeTono
          nombre="cabecera-aspecto-tono"
          valor={cabecera.tono}
          catalogo={catalogo}
          colores={colores}
          ocupado={ocupado}
          error={errorDe(error, 'tono')}
          alCambiar={(tono) => {
            alPoner({ tono })
          }}
        />
        <CamposDeEscala
          base="cabecera-aspecto"
          ocupado={ocupado}
          campos={[
            {
              clave: 'relleno',
              etiqueta: 'Relleno',
              opciones: OPCIONES_DE_RELLENO,
              valor: cabecera.relleno ?? ASPECTO_POR_DEFECTO.relleno,
              alElegir: (v) => {
                alPoner({ relleno: v as Relleno })
              },
            },
            ...camposDeTexto(cabecera, alPoner),
          ]}
        />
      </div>
    </Bloque>
  )
}
