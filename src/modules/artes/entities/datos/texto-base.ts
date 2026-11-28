// Las reglas del texto base de un origen antes de guardarlo, espejo de `artes_texto_base_guardar()`: sin `\r`, sin blancos en los bordes, de 1
// a 2.000 caracteres, y cada `{…}` del catálogo del origen (las de subasta, sólo en uno de subasta). Los mensajes son los de la base. Puro.
import { PATRON_DE_VARIABLE } from '@/shared/lib/texto-con-variables'
import { esClaveDelArte, noAplica, type CatalogoDelArte } from './variables-del-arte'

export const LARGO_MAXIMO_DEL_TEXTO_BASE = 2000

export type TextoBaseValidado =
  { ok: true; texto: string } | { ok: false; campo: 'texto' | 'variables'; motivo: string }

// Como la base: `\r\n` → `\n` y fuera los espacios, tabuladores y saltos de los bordes (no otro blanco).
export function normalizarTextoBase(texto: string): string {
  return texto.replaceAll('\r\n', '\n').replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, '')
}

// La primera `{…}` que el texto base no acepta, con el mensaje de la base; `null` si todas valen.
export function motivoDeLasVariables(texto: string, catalogo: CatalogoDelArte): string | null {
  for (const [, clave = ''] of texto.matchAll(PATRON_DE_VARIABLE)) {
    if (noAplica(clave, catalogo.tipo)) {
      return `{${clave}} sólo se llena en un origen de subasta.`
    }
    if (!esClaveDelArte(clave, catalogo)) {
      return `{${clave}} no es un dato que el texto base pueda llenar.`
    }
  }
  return null
}

export function validarTextoBase(texto: string, catalogo: CatalogoDelArte): TextoBaseValidado {
  const limpio = normalizarTextoBase(texto)
  if (limpio === '') {
    return { ok: false, campo: 'texto', motivo: 'El texto base no puede quedar vacío.' }
  }
  // Por caracteres, como `char_length()` de la base (un emoji es uno, no dos).
  if ([...limpio].length > LARGO_MAXIMO_DEL_TEXTO_BASE) {
    return { ok: false, campo: 'texto', motivo: 'El texto base lleva hasta 2000 caracteres.' }
  }
  const motivo = motivoDeLasVariables(limpio, catalogo)
  return motivo ? { ok: false, campo: 'variables', motivo } : { ok: true, texto: limpio }
}
