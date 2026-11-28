// Un texto con variables, resuelto con unos datos (docs/GLOSARIO.md › «Elemento con datos»): cada `{clave}` cambiada por su valor, en una sola
// pasada (lo que trae un valor, `{x}` o `$&`, no se vuelve a leer). Se mira la línea entera: si una de sus variables queda vacía, es una `{…}`
// que el arte no conoce o una de subasta en un origen que no es de subasta, **la línea se quita completa** (nunca «VIN: » solo, ni la llave
// literal). Las líneas en blanco que ya estaban, sin variables, se quedan. Lo usan el lienzo, la vista previa de «Textos» y el texto para
// compartir. Puro.
import { PATRON_DE_VARIABLE } from '@/shared/lib/texto-con-variables'
import type { ValoresDelArte } from './valores-del-arte'
import { esClaveDelArte, noAplica, type CatalogoDelArte } from './variables-del-arte'

export type TextoResuelto = {
  // Lo que se dibuja.
  texto: string
  // Sin repetir y en su orden: las `{…}` que el arte no conoce, las de subasta en un origen manual y las conocidas sin valor.
  desconocidas: string[]
  noAplican: string[]
  vacias: string[]
  // Cuántas líneas se quitaron.
  quitadas: number
}

function sumar(lista: string[], clave: string) {
  if (!lista.includes(clave)) {
    lista.push(clave)
  }
}

export function normalizarSaltos(texto: string): string {
  return texto.replace(/\r\n?/g, '\n')
}

type Catalogo = Pick<CatalogoDelArte, 'campos' | 'tipo'>

// El valor de una `{clave}` de la línea, o `null` si la línea se quita (y por qué, sumado a `resuelto`).
function valorEnLaLinea(
  clave: string,
  valores: ValoresDelArte,
  catalogo: Catalogo,
  resuelto: TextoResuelto,
): string | null {
  if (!esClaveDelArte(clave, catalogo)) {
    sumar(resuelto.desconocidas, clave)
    return null
  }
  if (noAplica(clave, catalogo.tipo)) {
    sumar(resuelto.noAplican, clave)
    return null
  }
  const valor = valores.get(clave)
  if (valor == null || valor === '') {
    sumar(resuelto.vacias, clave)
    return null
  }
  return valor
}

// La línea con sus valores, o `null` si alguna de sus variables la quita. Se miran todas (cada una suma su motivo).
function lineaResuelta(
  linea: string,
  valores: ValoresDelArte,
  catalogo: Catalogo,
  resuelto: TextoResuelto,
): string | null {
  const partes: string[] = []
  let desde = 0
  let seQuita = false
  for (const encontrada of linea.matchAll(PATRON_DE_VARIABLE)) {
    const valor = valorEnLaLinea(encontrada[1] ?? '', valores, catalogo, resuelto)
    seQuita ||= valor === null
    partes.push(linea.slice(desde, encontrada.index), valor ?? '')
    desde = encontrada.index + encontrada[0].length
  }
  partes.push(linea.slice(desde))
  return seQuita ? null : partes.join('')
}

export function resolverTexto(
  texto: string,
  valores: ValoresDelArte,
  catalogo: Catalogo,
): TextoResuelto {
  const resuelto: TextoResuelto = {
    texto: '',
    desconocidas: [],
    noAplican: [],
    vacias: [],
    quitadas: 0,
  }
  const lineas: string[] = []
  for (const linea of normalizarSaltos(texto).split('\n')) {
    const escrita = lineaResuelta(linea, valores, catalogo, resuelto)
    if (escrita === null) {
      resuelto.quitadas += 1
    } else {
      lineas.push(escrita)
    }
  }
  resuelto.texto = lineas.join('\n')
  return resuelto
}

// Un texto que se quedó sin nada que mostrar porque se le quitaron líneas: su capa se esconde.
export function quedoVacio(resuelto: Pick<TextoResuelto, 'texto' | 'quitadas'>): boolean {
  return resuelto.quitadas > 0 && resuelto.texto.trim() === ''
}

// Las `{…}` de un texto que el arte no conoce (sin repetir, en su orden): las que impiden guardar la plantilla de arte.
export function desconocidasDelTexto(
  texto: string,
  catalogo: Pick<CatalogoDelArte, 'campos'>,
): string[] {
  const desconocidas: string[] = []
  for (const [, clave = ''] of texto.matchAll(PATRON_DE_VARIABLE)) {
    if (!esClaveDelArte(clave, catalogo)) {
      sumar(desconocidas, clave)
    }
  }
  return desconocidas
}

// Las de subasta que un texto nombra en un origen que no es de subasta.
export function noAplicanDelTexto(
  texto: string,
  catalogo: Pick<CatalogoDelArte, 'tipo'>,
): string[] {
  const claves: string[] = []
  for (const [, clave = ''] of texto.matchAll(PATRON_DE_VARIABLE)) {
    if (noAplica(clave, catalogo.tipo)) {
      sumar(claves, clave)
    }
  }
  return claves
}

function unidas(elementos: readonly string[]): string {
  const ultimo = elementos.at(-1) ?? ''
  return elementos.length < 2 ? ultimo : `${elementos.slice(0, -1).join(', ')} y ${ultimo}`
}

// «{x} no es un dato que el arte pueda llenar.»; `null` si todas valen.
export function textoDeVariablesDesconocidas(claves: readonly string[]): string | null {
  if (claves.length === 0) {
    return null
  }
  const escritas = unidas(claves.map((clave) => `{${clave}}`))
  return claves.length === 1
    ? `${escritas} no es un dato que el arte pueda llenar.`
    : `${escritas} no son datos que el arte pueda llenar.`
}

// «{lote} no aplica en Manuales: no es de subasta.»; `null` si no hay ninguna.
export function textoDeLasQueNoAplican(claves: readonly string[], origen: string): string | null {
  if (claves.length === 0) {
    return null
  }
  const escritas = unidas(claves.map((clave) => `{${clave}}`))
  return claves.length === 1
    ? `${escritas} no aplica en ${origen}: no es de subasta.`
    : `${escritas} no aplican en ${origen}: no son de subasta.`
}

// Junto a «Guardar»: «Corrige {x} para guardar.»
export function motivoParaNoGuardar(desconocidas: readonly string[]): string | null {
  return desconocidas.length === 0
    ? null
    : `Corrige ${unidas(desconocidas.map((clave) => `{${clave}}`))} para guardar.`
}
