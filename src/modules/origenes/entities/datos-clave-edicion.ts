// Cómo se edita la lista de datos clave en «Campos» (las casillas del editor): operaciones puras sobre la lista (cada una devuelve otra) y
// el motivo de «Hacer dato clave» apagado. La base vuelve a validar cada lista que llega (`origen_datos_clave_guardar()`).
import {
  DATOS_COMUNES,
  MENSAJE_TOPE_DE_DATOS_CLAVE,
  TOPE_DE_DATOS_CLAVE,
  type DatoClave,
} from './datos-clave'

export const MOTIVO_SIN_PERMISO_DATOS_CLAVE =
  'Para elegir los datos clave hace falta gestionar los orígenes.'

export const MOTIVO_DATOS_CLAVE_VACIOS =
  'Sin datos clave: la ficha mostrará los de fábrica de su tipo.'

export function mismoDato(a: DatoClave, b: DatoClave): boolean {
  if ('comun' in a) {
    return 'comun' in b && a.comun === b.comun
  }
  return 'campo' in b && a.campo === b.campo
}

export function esDatoClave(lista: readonly DatoClave[], dato: DatoClave): boolean {
  return lista.some((otro) => mismoDato(otro, dato))
}

export function sinDatoClave(lista: readonly DatoClave[], dato: DatoClave): DatoClave[] {
  return lista.filter((otro) => !mismoDato(otro, dato))
}

// Lo pone en ese lugar (0 = primero). Si ya estaba, cambia de lugar; si es nuevo, entra ahí y corre a los demás (nunca más allá del
// último). Con 4, uno nuevo no reemplaza a nadie: la lista queda igual.
export function ponerDatoClave(
  lista: readonly DatoClave[],
  dato: DatoClave,
  posicion: number,
): DatoClave[] {
  const desde = lista.findIndex((otro) => mismoDato(otro, dato))
  if (desde >= 0) {
    return moverDatoClaveA(lista, desde, Math.max(0, Math.min(posicion, lista.length - 1)))
  }
  if (lista.length >= TOPE_DE_DATOS_CLAVE) {
    return [...lista]
  }
  const lugar = Math.max(0, Math.min(posicion, lista.length))
  return [...lista.slice(0, lugar), dato, ...lista.slice(lugar)]
}

// Lo lleva de un lugar a otro (el resto se corre). Fuera de la lista, queda igual.
export function moverDatoClaveA(
  lista: readonly DatoClave[],
  desde: number,
  hasta: number,
): DatoClave[] {
  if (desde < 0 || desde >= lista.length || hasta < 0 || hasta >= lista.length) {
    return [...lista]
  }
  const copia = [...lista]
  const [movido] = copia.splice(desde, 1)
  if (movido === undefined) {
    return [...lista]
  }
  copia.splice(hasta, 0, movido)
  return copia
}

// La llave con que el editor nombra un dato clave (`comun:<clave>` o `campo:<clave>`), y de vuelta. Una llave que no es un dato clave
// conocido (un común que no existe) es null.
export function llaveDeDatoClave(dato: DatoClave): string {
  return 'comun' in dato ? `comun:${dato.comun}` : `campo:${dato.campo}`
}

export function datoDeLlave(llave: string): DatoClave | null {
  if (llave.startsWith('campo:')) {
    const campo = llave.slice('campo:'.length)
    return campo === '' ? null : { campo }
  }
  if (llave.startsWith('comun:')) {
    const clave = llave.slice('comun:'.length)
    const comun = DATOS_COMUNES.find((otro) => otro.clave === clave)
    return comun ? { comun: comun.clave } : null
  }
  return null
}

// Por qué ese dato no se puede hacer dato clave (o quitar), o null. Quitar uno marcado siempre se puede (con el permiso).
export function motivoParaNoMarcar({
  lista,
  dato,
  puedeGestionar,
}: {
  lista: readonly DatoClave[]
  dato: DatoClave
  puedeGestionar: boolean
}): string | null {
  if (!puedeGestionar) {
    return MOTIVO_SIN_PERMISO_DATOS_CLAVE
  }
  if (!esDatoClave(lista, dato) && lista.length >= TOPE_DE_DATOS_CLAVE) {
    return MENSAJE_TOPE_DE_DATOS_CLAVE
  }
  return null
}
