import { ORDEN_DE_HUECOS } from './hueco'

// Las tarjetas de la unidad (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): cada una junta los huecos de un tema, dice su resumen y abre sus huecos en un drawer. El
// mapa vive junto a `ORDEN_DE_HUECOS` (el mismo dato, la misma clave), y no en la declaración de cada área: así `repuestos` no conoce las tarjetas de `logistica`. El
// `Record` obliga a ponerle tarjeta (o ninguna) a toda clave nueva. «Qué falta» no es una tarjeta: va siempre a la vista, al costado.
export type ClaveDeHueco = (typeof ORDEN_DE_HUECOS)[number]

/** El orden fijo de las tarjetas en la página y en los drawers. */
export const ORDEN_DE_TARJETAS = [
  'documentos',
  'transporte',
  'repuestos',
  'aduana',
  'dinero',
  'notas',
  'historial',
] as const

export type ClaveDeTarjeta = (typeof ORDEN_DE_TARJETAS)[number]

export const TARJETA_DEL_HUECO: Record<ClaveDeHueco, ClaveDeTarjeta | null> = {
  'que-falta': null,
  documentos: 'documentos',
  notas: 'notas',
  historial: 'historial',
  transporte: 'transporte',
  repuestos: 'repuestos',
  aduana: 'aduana',
  gastos: 'dinero',
  pagos: 'dinero',
  margen: 'dinero',
}

export const TITULO_DE_LA_TARJETA: Record<ClaveDeTarjeta, string> = {
  documentos: 'Documentos',
  transporte: 'Transporte',
  repuestos: 'Repuestos',
  aduana: 'Aduana',
  dinero: 'Dinero',
  notas: 'Notas',
  historial: 'Historial',
}

/** ¿Es la clave de una tarjeta? Lo que no lo es (una URL a mano, un `?hueco=pagos` viejo) no abre nada. */
export function esTarjetaConocida(clave: string | null | undefined): clave is ClaveDeTarjeta {
  return (ORDEN_DE_TARJETAS as readonly string[]).includes(clave ?? '')
}

const esClaveDeHueco = (clave: string): clave is ClaveDeHueco =>
  (ORDEN_DE_HUECOS as readonly string[]).includes(clave)

/** La tarjeta que contiene ese hueco (`dinero` para gastos, pagos y margen); nula para «Qué falta» o una clave desconocida. */
export function tarjetaDelHueco(clave: string | null | undefined): ClaveDeTarjeta | null {
  return clave !== null && clave !== undefined && esClaveDeHueco(clave)
    ? TARJETA_DEL_HUECO[clave]
    : null
}

/** Los huecos de una tarjeta, en el orden del panel. */
export function huecosDeLaTarjeta(tarjeta: ClaveDeTarjeta): ClaveDeHueco[] {
  return ORDEN_DE_HUECOS.filter((h) => TARJETA_DEL_HUECO[h] === tarjeta)
}

export type TarjetaConSusHuecos<H extends { clave: string }> = {
  clave: ClaveDeTarjeta
  titulo: string
  huecos: H[]
}

/**
 * Las tarjetas que se dibujan, en `ORDEN_DE_TARJETAS`, cada una con sus huecos visibles (ya filtrados por permisos y reglas) en el orden del panel. Una tarjeta sin
 * ningún hueco visible no aparece: Dinero aparece si se ve alguno de gastos, pagos o margen, y trae sólo esos. «Qué falta» y las claves desconocidas no entran.
 */
export function tarjetasDeLaUnidad<H extends { clave: string }>(
  huecos: readonly H[],
): TarjetaConSusHuecos<H>[] {
  return ORDEN_DE_TARJETAS.flatMap((clave) => {
    const suyos = huecosDeLaTarjeta(clave).flatMap((h) => huecos.filter((x) => x.clave === h))
    return suyos.length === 0 ? [] : [{ clave, titulo: TITULO_DE_LA_TARJETA[clave], huecos: suyos }]
  })
}
