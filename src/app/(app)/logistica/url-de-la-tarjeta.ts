import {
  CLAVE_DE_DONDE_VIAJA,
  CLAVE_DE_GASTO,
  CLAVE_DE_PAGO,
  CLAVE_DE_SUBIR,
  CLAVE_DEL_TIPO_A_SUBIR,
  PANELES_DEL_GASTO,
  PANELES_DEL_PAGO,
  type ClaveDeTarjeta,
} from '@/modules/logistica'
import type { UrlDeLaTarjeta } from '@/modules/logistica/pantallas/unidad-pagina'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'

const SIN_CLAVES: UrlDeLaTarjeta = { claves: [] }

// Las claves de la URL que trae el drawer de cada tarjeta (se borran al cerrarlo) y las que lo abren solas aunque falte `?hueco=`: un enlace de siempre a «Subir documentos»
// (`?subir=documentos`) o a un gasto o un pago (`?panel=pago&pago=<id>`) abre su tarjeta y, adentro, el hueco atiende su panel como antes. Las une `src/app`: el núcleo no conoce
// los paneles de cada área.
const URL_DE_LA_TARJETA: Partial<Record<ClaveDeTarjeta, UrlDeLaTarjeta>> = {
  documentos: {
    claves: [CLAVE_DE_SUBIR, CLAVE_DEL_TIPO_A_SUBIR],
    abreSola: [{ clave: CLAVE_DE_SUBIR, valores: ['documentos'] }],
  },
  // «Elegir o crear» del hueco (`?transporte=donde-viaja`) se cierra con su drawer.
  transporte: { claves: [CLAVE_DE_DONDE_VIAJA] },
  dinero: {
    claves: [CLAVE_DE_PANEL, CLAVE_DE_GASTO, CLAVE_DE_PAGO],
    abreSola: [{ clave: CLAVE_DE_PANEL, valores: [...PANELES_DEL_GASTO, ...PANELES_DEL_PAGO] }],
  },
}

export function urlDeLaTarjeta(tarjeta: ClaveDeTarjeta): UrlDeLaTarjeta {
  return URL_DE_LA_TARJETA[tarjeta] ?? SIN_CLAVES
}
