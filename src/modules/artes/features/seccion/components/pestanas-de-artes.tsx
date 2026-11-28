'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import {
  CLAVE_DE_FORMATO,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_PESTANA,
  CLAVE_DE_QUIENES,
  type PestanaDeArtes,
} from '../../../entities/filtros'
import { CLAVE_DE_LA_IMAGEN, CLAVE_DE_LA_PLANTILLA } from '../../../entities/paneles'

const PESTANAS = [
  { clave: 'plantillas', titulo: 'Plantillas' },
  { clave: 'imagenes', titulo: 'Imágenes' },
]

// Todo lo de la URL que pertenece a una pestaña: cambiar de pestaña lo borra (los filtros de Plantillas no valen en Imágenes, y un panel
// abierto nombra una fila de la otra).
const PARAMETROS = Object.fromEntries(
  [
    CLAVE_DE_PESTANA,
    CLAVE_DE_ORIGEN,
    CLAVE_DE_FORMATO,
    CLAVE_DE_QUIENES,
    CLAVE_DE_PANEL,
    CLAVE_DE_LA_PLANTILLA,
    CLAVE_DE_LA_IMAGEN,
  ].map((clave) => [clave, parseAsString]),
)

// La barra de `/artes`: Plantillas · Imágenes, en la URL (`?pestana=imagenes`; Plantillas es la de entrada y no se escribe). Siempre a la vista
// y del mismo alto; el servidor lee sólo la abierta.
export function PestanasDeArtes({ valor }: { valor: PestanaDeArtes }) {
  const [, fijar] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <div className="min-h-11 min-w-0 border-b border-(--color-line)">
      <PestanasConDesborde
        pestanas={PESTANAS}
        valor={valor}
        alElegir={(elegida) => {
          void fijar({
            ...Object.fromEntries(Object.keys(PARAMETROS).map((clave) => [clave, null])),
            [CLAVE_DE_PESTANA]: elegida === 'imagenes' ? 'imagenes' : null,
          })
        }}
      />
    </div>
  )
}
