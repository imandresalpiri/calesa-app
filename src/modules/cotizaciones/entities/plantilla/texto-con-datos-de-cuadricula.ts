// La forma de las partes de un texto con datos (glosario: «Texto con datos»), espejo de `_plantilla_cuadricula_partes()`, en el mismo orden y con las mismas
// rutas: que sea un arreglo de 1 a 20 partes (`…partes`); por parte, un string no vacío, sin «{{» y que no sigue a otro string (`…partes[2]`), o un dato con su
// forma (`…partes[2].nodo`); y al final, que lleve al menos un dato y que el texto sume hasta 300 caracteres (code points), los dos en `…partes`. Una sola forma
// por contenido: sin datos se escribe `{tipo: 'texto', texto}`.
import {
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  MAXIMO_DE_PARTES_DE_UN_TEXTO,
} from '../cuadricula-de-la-tarjeta'
import { caracteres } from '../json-de-la-base'
import { formaRota } from './campos-de-cuadricula'
import { revisarDato } from './condiciones-de-cuadricula'
import type { RechazoDePlantilla } from './motivos-de-plantilla'

export function revisarPartes(v: unknown, donde: string): RechazoDePlantilla | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAXIMO_DE_PARTES_DE_UN_TEXTO)
    return formaRota(donde)
  let largo = 0
  let datos = 0
  let anteriorEsTexto = false
  for (const [k, parte] of v.entries()) {
    const dk = `${donde}[${String(k)}]`
    if (typeof parte === 'string') {
      if (parte === '' || parte.includes('{{') || anteriorEsTexto) return formaRota(dk)
      largo += caracteres(parte)
      anteriorEsTexto = true
      continue
    }
    const rechazo = revisarDato(parte, dk)
    if (rechazo !== null) return rechazo
    datos += 1
    anteriorEsTexto = false
  }
  if (datos === 0 || largo > MAXIMO_DE_CARACTERES_DE_UN_TEXTO) return formaRota(donde)
  return null
}
