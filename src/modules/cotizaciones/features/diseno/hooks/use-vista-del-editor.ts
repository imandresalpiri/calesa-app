'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import {
  ANCHO_DEL_EDITOR_DE_LA_HOJA,
  ANCHOS_DE_LA_VISTA_PREVIA,
  type AnchoDeLaVistaPrevia,
} from '../../../entities/diseno/anchos-de-la-vista-previa'

const CLAVE_DE_VISTA = 'vista'

// La vista del editor de la hoja (`?vista=412|1280|1920|200`): sin el parámetro, la que corresponde al ancho de la ventana (la grande desde 1.920 px, la
// laptop desde 1.280 y si no el celular, como `vistaParaLaPantalla()`). Elegir reemplaza la entrada del historial y no mueve el scroll. `editable` es falso
// por debajo de 1.024 px (y en el servidor, hasta hidratar): la hoja se ve a 412 en sólo lectura.
export function useVistaDelEditor() {
  const [elegida, poner] = useQueryState(
    CLAVE_DE_VISTA,
    parseAsStringLiteral(ANCHOS_DE_LA_VISTA_PREVIA).withOptions({
      history: 'replace',
      scroll: false,
    }),
  )
  const grande = useConsultaDeMedios('(min-width: 1920px)')
  const laptop = useConsultaDeMedios('(min-width: 1280px)')
  const editable = useConsultaDeMedios(ANCHO_DEL_EDITOR_DE_LA_HOJA)
  const porLaPantalla: AnchoDeLaVistaPrevia = grande ? '1920' : laptop ? '1280' : '412'
  return {
    vista: elegida ?? porLaPantalla,
    editable,
    elegir: (vista: AnchoDeLaVistaPrevia) => {
      void poner(vista)
    },
  }
}
