// Lo que ofrece el combo de un catálogo (un grupo de campos, una categoría) según lo tipeado: las coincidencias en el orden del
// catálogo, si lo escrito ya existe (sin importar mayúsculas, tildes ni espacios) y si se puede crear. Sin I/O: el combo lo dibuja.
import { claveDeNombre, nombreLimpio } from './nombre'
import type { ElementoDeCatalogo } from './tipos'

// Los valores de las opciones que no son un elemento: «Sin grupo» y «Crear «x»».
export const SIN_VALOR = '__sin_valor'
export const CREAR = '__crear'

export type OpcionDelCombo = { id: string; nombre: string; inactivo: boolean }

export type OpcionesDelCombo = {
  // «Sin …» no está: va siempre primero y la dibuja el combo.
  opciones: OpcionDelCombo[]
  // El que ya tiene ese nombre, también si está inactivo: entonces no se ofrece crear.
  existente: ElementoDeCatalogo | null
  // El nombre limpio que «Crear «x»» crearía, o null.
  crear: string | null
  // La opción que toma Enter: la exacta, si no la primera coincidencia, si no «Crear», si no «Sin …».
  resaltada: string
}

type Entrada = {
  elementos: readonly ElementoDeCatalogo[]
  // El id elegido ahora (null = sin valor): se ofrece aunque esté inactivo.
  valorActual: string | null
  texto: string
  puedeCrear: boolean
}

export function opcionesDelCombo({
  elementos,
  valorActual,
  texto,
  puedeCrear,
}: Entrada): OpcionesDelCombo {
  const limpio = nombreLimpio(texto)
  const buscada = claveDeNombre(texto)
  const opciones = elementos
    .filter((elemento) => elemento.activo || elemento.id === valorActual)
    .filter((elemento) => claveDeNombre(elemento.nombre).includes(buscada))
    .map((elemento) => ({ id: elemento.id, nombre: elemento.nombre, inactivo: !elemento.activo }))
  const existente =
    buscada === ''
      ? null
      : (elementos.find((elemento) => claveDeNombre(elemento.nombre) === buscada) ?? null)
  const crear = limpio !== '' && existente === null && puedeCrear ? limpio : null
  return {
    opciones,
    existente,
    crear,
    resaltada: resaltadaDe({ opciones, existente, crear, valorActual, buscada }),
  }
}

function resaltadaDe({
  opciones,
  existente,
  crear,
  valorActual,
  buscada,
}: Omit<OpcionesDelCombo, 'resaltada'> & { valorActual: string | null; buscada: string }): string {
  if (buscada === '') {
    return valorActual !== null && opciones.some((opcion) => opcion.id === valorActual)
      ? valorActual
      : SIN_VALOR
  }
  if (existente && opciones.some((opcion) => opcion.id === existente.id)) {
    return existente.id
  }
  return opciones[0]?.id ?? (crear === null ? SIN_VALOR : CREAR)
}
