import { parseAsString } from 'nuqs'
import { CLAVE_DEL_PARA } from '../../../entities/nucleo/catalogo-del-origen'

// Las claves de URL del modal de un catálogo de logística dentro de su drawer (`?panel=puertos|navieras|categorias-de-gasto`): la acción va en
// `?accion=` (`panel` ya es el drawer), «Para» en `?de=origen|compartido` y la fila que se edita en su clave (`?puerto=<id>`). Los parámetros de
// `nuqs` son una constante por catálogo: no se arman en cada render.
export const CLAVE_DE_ACCION = 'accion'

export type PanelesDelCatalogo = {
  nuevo: string
  editar: string
  clave: string
  parametros: Record<string, typeof parseAsString>
}

export function panelesDelCatalogo(
  nuevo: string,
  editar: string,
  clave: string,
): PanelesDelCatalogo {
  return {
    nuevo,
    editar,
    clave,
    parametros: {
      [CLAVE_DE_ACCION]: parseAsString,
      [CLAVE_DEL_PARA]: parseAsString,
      [clave]: parseAsString,
    },
  }
}
