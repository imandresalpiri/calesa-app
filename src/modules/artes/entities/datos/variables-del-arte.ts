// El catálogo de variables de un arte, por origen (docs/GLOSARIO.md › «Elemento con datos»): las fijas de todo origen, las de subasta (sólo en
// uno de tipo `subasta`), un campo activo de la ficha del origen por su clave (`{ficha.<clave>}`), una celda de la tarjeta por su concepto
// (`{celda.<concepto>}`) y las redes de la empresa (`{red.<red>}`). Lo usan el texto de las capas del lienzo y el texto base del origen, que la
// base valida con la misma regla: `CLAVES_COMUNES_DEL_ARTE` y `CLAVES_DE_SUBASTA` son el espejo de `_artes_texto_base_variables_validas()`
// (`scripts/guardas/texto-base-de-artes.test.ts` los compara). Puro.
import { REDES_DEL_ARTE, type RedDelArte, type TipoDeOrigenDelArte } from './tipos'

export const GRUPOS_DE_VARIABLES = [
  'vehiculo',
  'cotizacion',
  'cliente',
  'quien',
  'empresa',
] as const
export type GrupoDeVariable = (typeof GRUPOS_DE_VARIABLES)[number]

export const TITULOS_DE_LOS_GRUPOS: Readonly<Record<GrupoDeVariable, string>> = {
  vehiculo: 'Vehículo',
  cotizacion: 'Cotización',
  cliente: 'Cliente',
  quien: 'Quien comparte',
  empresa: 'Empresa',
}

export type VariableDelArte = { clave: string; etiqueta: string; grupo: GrupoDeVariable }

export const PREFIJO_DE_FICHA = 'ficha.'
export const PREFIJO_DE_CELDA = 'celda.'
export const PREFIJO_DE_RED = 'red.'

export const ETIQUETA_DE_LA_RED: Readonly<Record<RedDelArte, string>> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
}

// Las de todo origen, en el orden de la base.
export const CLAVES_COMUNES_DEL_ARTE = [
  'vehiculo',
  'marca',
  'modelo',
  'anio',
  'color',
  'kilometraje',
  'vin',
  'origen',
  'ubicacion',
  'numero',
  'total',
  'modo',
  'vigencia',
  'cliente',
  'asesor',
  'cargo',
  'whatsapp',
  'empresa',
  'web',
  ...REDES_DEL_ARTE.map((red) => `${PREFIJO_DE_RED}${red}`),
] as const

// Las que sólo tienen valor en un origen de subasta: en uno manual son conocidas pero «no aplican».
export const CLAVES_DE_SUBASTA = ['lote', 'subasta', 'hora_del_patio', 'enlace_del_lote'] as const

const DE_LAS_FIJAS: Readonly<Record<string, Omit<VariableDelArte, 'clave'>>> = {
  vehiculo: { etiqueta: 'Vehículo', grupo: 'vehiculo' },
  marca: { etiqueta: 'Marca', grupo: 'vehiculo' },
  modelo: { etiqueta: 'Modelo', grupo: 'vehiculo' },
  anio: { etiqueta: 'Año', grupo: 'vehiculo' },
  color: { etiqueta: 'Color', grupo: 'vehiculo' },
  kilometraje: { etiqueta: 'Kilometraje', grupo: 'vehiculo' },
  vin: { etiqueta: 'VIN', grupo: 'vehiculo' },
  lote: { etiqueta: 'Lote', grupo: 'vehiculo' },
  origen: { etiqueta: 'Origen', grupo: 'vehiculo' },
  ubicacion: { etiqueta: 'Ubicación', grupo: 'vehiculo' },
  subasta: { etiqueta: 'Subasta', grupo: 'vehiculo' },
  hora_del_patio: { etiqueta: 'Hora del patio', grupo: 'vehiculo' },
  enlace_del_lote: { etiqueta: 'Enlace del lote', grupo: 'vehiculo' },
  numero: { etiqueta: 'Número de cotización', grupo: 'cotizacion' },
  total: { etiqueta: 'Total', grupo: 'cotizacion' },
  modo: { etiqueta: 'Modo de tipo de cambio', grupo: 'cotizacion' },
  vigencia: { etiqueta: 'Válida hasta', grupo: 'cotizacion' },
  cliente: { etiqueta: 'Cliente', grupo: 'cliente' },
  asesor: { etiqueta: 'Asesor', grupo: 'quien' },
  cargo: { etiqueta: 'Cargo', grupo: 'quien' },
  whatsapp: { etiqueta: 'WhatsApp', grupo: 'quien' },
  empresa: { etiqueta: 'Empresa', grupo: 'empresa' },
  web: { etiqueta: 'Web', grupo: 'empresa' },
  ...Object.fromEntries(
    REDES_DEL_ARTE.map((red) => [
      `${PREFIJO_DE_RED}${red}`,
      { etiqueta: ETIQUETA_DE_LA_RED[red], grupo: 'empresa' as const },
    ]),
  ),
}

// El orden en que se ofrecen: el del vehículo como se lee (lo de la subasta después del origen), luego la cotización, el cliente, quien
// comparte y la empresa.
const ORDEN_DE_LAS_FIJAS = [
  'vehiculo',
  'marca',
  'modelo',
  'anio',
  'color',
  'kilometraje',
  'vin',
  'lote',
  'origen',
  'ubicacion',
  'subasta',
  'hora_del_patio',
  'enlace_del_lote',
  'numero',
  'total',
  'modo',
  'vigencia',
  'cliente',
  'asesor',
  'cargo',
  'whatsapp',
  'empresa',
  'web',
  ...REDES_DEL_ARTE.map((red) => `${PREFIJO_DE_RED}${red}`),
]

const COMUNES: ReadonlySet<string> = new Set(CLAVES_COMUNES_DEL_ARTE)
const DE_SUBASTA: ReadonlySet<string> = new Set(CLAVES_DE_SUBASTA)

// Un campo de la ficha del origen que un arte puede nombrar: uno activo (los desactivados no se ofrecen ni valen).
export type CampoDelArte = { clave: string; etiqueta: string; activo: boolean }

// Lo que un arte de un origen puede nombrar. `campos`: clave → etiqueta de los campos activos de su ficha; `variables`: lo que se ofrece (las
// fijas que aplican y los campos de la ficha que no repiten una fija).
export type CatalogoDelArte = {
  tipo: TipoDeOrigenDelArte
  campos: ReadonlyMap<string, string>
  variables: readonly VariableDelArte[]
}

export function variablesDelArte({
  tipo,
  campos,
}: {
  tipo: TipoDeOrigenDelArte
  campos: readonly CampoDelArte[]
}): CatalogoDelArte {
  const activos = new Map(campos.filter((c) => c.activo).map((c) => [c.clave, c.etiqueta]))
  const fijas = ORDEN_DE_LAS_FIJAS.filter((clave) => !noAplica(clave, tipo)).map((clave) => ({
    clave,
    ...(DE_LAS_FIJAS[clave] ?? { etiqueta: clave, grupo: 'vehiculo' as const }),
  }))
  const deLaFicha = [...activos]
    .filter(([clave]) => !COMUNES.has(clave) && !DE_SUBASTA.has(clave))
    .map(([clave, etiqueta]) => ({
      clave: `${PREFIJO_DE_FICHA}${clave}`,
      etiqueta,
      grupo: 'vehiculo' as const,
    }))
  return { tipo, campos: activos, variables: [...fijas, ...deLaFicha] }
}

// Una variable de subasta en un origen que no es de subasta: conocida, pero sin valor posible (su línea se quita y se avisa).
export function noAplica(clave: string, tipo: TipoDeOrigenDelArte): boolean {
  return tipo !== 'subasta' && DE_SUBASTA.has(clave)
}

// Si el arte sabe qué es esta `{clave}` (aunque en este origen no aplique): una fija, una de subasta, un campo activo de la ficha o una celda
// con algo después del punto (como la base: `char_length > 6`, sin recortar).
export function esClaveDelArte(clave: string, catalogo: Pick<CatalogoDelArte, 'campos'>): boolean {
  if (COMUNES.has(clave) || DE_SUBASTA.has(clave)) {
    return true
  }
  if (clave.startsWith(PREFIJO_DE_FICHA)) {
    return catalogo.campos.has(clave.slice(PREFIJO_DE_FICHA.length))
  }
  if (clave.startsWith(PREFIJO_DE_CELDA)) {
    return clave.length > PREFIJO_DE_CELDA.length
  }
  return false
}

// Si una `{clave}` vale en este origen: conocida y que aplica (la regla del texto base y del guardado de una plantilla).
export function valeEnElOrigen(clave: string, catalogo: CatalogoDelArte): boolean {
  return esClaveDelArte(clave, catalogo) && !noAplica(clave, catalogo.tipo)
}

// Cómo se nombra el dato de una `{clave}` en un aviso («le faltan … el VIN»), con su artículo.
export function nombreDelDato(clave: string, catalogo: Pick<CatalogoDelArte, 'campos'>): string {
  if (clave.startsWith(PREFIJO_DE_FICHA)) {
    const etiqueta = catalogo.campos.get(clave.slice(PREFIJO_DE_FICHA.length))
    return `«${etiqueta ?? clave}»`
  }
  if (clave.startsWith(PREFIJO_DE_CELDA)) {
    return `«${clave.slice(PREFIJO_DE_CELDA.length)}»`
  }
  if (clave.startsWith(PREFIJO_DE_RED)) {
    const red = clave.slice(PREFIJO_DE_RED.length) as RedDelArte
    return `el ${ETIQUETA_DE_LA_RED[red]} de la empresa`
  }
  return NOMBRES[clave] ?? `{${clave}}`
}

const NOMBRES: Readonly<Record<string, string>> = {
  vehiculo: 'el vehículo',
  marca: 'la marca',
  modelo: 'el modelo',
  anio: 'el año',
  color: 'el color',
  kilometraje: 'el kilometraje',
  vin: 'el VIN',
  lote: 'el lote',
  origen: 'el origen',
  ubicacion: 'la ubicación',
  subasta: 'la subasta',
  hora_del_patio: 'la hora del patio',
  enlace_del_lote: 'el enlace del lote',
  numero: 'el número de cotización',
  total: 'el total',
  modo: 'el modo de tipo de cambio',
  vigencia: 'la vigencia',
  cliente: 'el cliente',
  asesor: 'el asesor',
  cargo: 'el cargo',
  whatsapp: 'el WhatsApp',
  empresa: 'el nombre de la empresa',
  web: 'la web',
}

// Las que salen de la cotización: sin cotización elegida, todas faltan juntas («la cotización»).
export function esDeLaCotizacion(clave: string): boolean {
  return DE_LAS_FIJAS[clave]?.grupo === 'cotizacion' || clave.startsWith(PREFIJO_DE_CELDA)
}
