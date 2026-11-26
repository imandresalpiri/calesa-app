// Un catálogo propio de un origen o compartido con todos (puertos, navieras, categorías de gasto, tipos de documento): dos nombres con la misma
// clave son el mismo, y un propio activo tapa en su origen al compartido de su clave. Puro: la base es la fuente (`_catalogo_clave()`) y aquí se
// calcula lo que cada origen usa para ofrecerlo.

const CON_TILDE = 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ'
const SIN_TILDE = 'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
const CAMBIO = new Map([...CON_TILDE].map((letra, i) => [letra, SIN_TILDE[i] ?? letra]))

// Espejo exacto de `_catalogo_clave()`: baja sólo A–Z (`lower(… collate "C")`), quita las tildes de la misma tabla, colapsa los espacios de
// `[ \t\n\r\f\v]` y recorta sólo esos. Nada de `toLowerCase()` ni `trim()`: bajarían «Ø» y recortarían el espacio duro, y la base no.
export function claveDeCatalogo(texto: string | null | undefined): string {
  const bajo = (texto ?? '').replace(/[A-Z]/g, (letra) => letra.toLowerCase())
  const sinTildes = [...bajo].map((letra) => CAMBIO.get(letra) ?? letra).join('')
  return sinTildes.replace(/[ \t\n\r\f\v]+/g, ' ').replace(/^ | $/g, '')
}

export type FilaPropiaOCompartida = {
  id: string
  // Nulo: compartido con todos los orígenes.
  origenId: string | null
  // `claveDeCatalogo()` de su nombre (los puertos, de nombre y país).
  clave: string
  activo: boolean
}

// Las claves que tapa un origen: las de sus propios activos.
function clavesTapadas<F extends FilaPropiaOCompartida>(
  filas: readonly F[],
  origenId: string,
): Set<string> {
  return new Set(filas.filter((f) => f.origenId === origenId && f.activo).map((f) => f.clave))
}

// Lo que usa un origen: sus propios y los compartidos que no tapa con un propio activo de su clave. Sin origen (repuestos), los compartidos.
export function loQueUsaElOrigen<F extends FilaPropiaOCompartida>(
  filas: readonly F[],
  origenId: string | null,
): F[] {
  if (origenId === null) {
    return filas.filter((f) => f.origenId === null)
  }
  const tapadas = clavesTapadas(filas, origenId)
  return filas.filter(
    (f) => f.origenId === origenId || (f.origenId === null && !tapadas.has(f.clave)),
  )
}

// El propio activo del origen que tapa a un compartido, o nulo (un propio no lo tapa nadie).
export function tapadoPor<F extends FilaPropiaOCompartida>(
  fila: F,
  filas: readonly F[],
  origenId: string | null,
): F | null {
  if (fila.origenId !== null || origenId === null) {
    return null
  }
  return filas.find((f) => f.origenId === origenId && f.activo && f.clave === fila.clave) ?? null
}

// Lo que pueden usar a la vez unidades de varios orígenes (una aplicación de todo o nada): con uno solo, lo que usa ese origen; con varios, sólo
// los compartidos que no tapa ninguno, porque un propio fallaría en las unidades de los demás. Sin orígenes, los compartidos.
export function loQueUsanLosOrigenes<F extends FilaPropiaOCompartida>(
  filas: readonly F[],
  origenes: readonly string[],
): F[] {
  const distintos = [...new Set(origenes)]
  if (distintos.length <= 1) {
    return loQueUsaElOrigen(filas, distintos[0] ?? null)
  }
  const tapadas = new Set(distintos.flatMap((o) => [...clavesTapadas(filas, o)]))
  return filas.filter((f) => f.origenId === null && !tapadas.has(f.clave))
}
