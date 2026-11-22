// Lo que hace elegir una función en `fx ▾` de la barra de fórmula: con el texto vacío, `=SUMA()`; con algo escrito sin «=» (el número de un valor fijo), lo
// envuelve, `=SUMA(100)`, para que la cifra no se pierda (en un valor fijo en %, que se escribe en puntos, con su «%»: `=SUMA(10%)` sigue valiendo 0,1); con
// una fórmula, inserta `SUMA()` en el cursor, nunca antes de su «=». El cursor queda antes del paréntesis que cierra, listo para tocar las celdas. Puro.

export type TextoConCursor = { readonly texto: string; readonly cursor: number }

export function insertarFuncion(
  texto: string,
  cursor: number,
  nombre: string,
  enPuntos = false,
): TextoConCursor {
  if (!texto.trimStart().startsWith('=')) {
    const escrito = texto.trim()
    const adentro = enPuntos && escrito !== '' ? `${escrito}%` : escrito
    return { texto: `=${nombre}(${adentro})`, cursor: nombre.length + 2 + adentro.length }
  }
  const en = Math.max(texto.indexOf('=') + 1, Math.min(cursor, texto.length))
  return {
    texto: `${texto.slice(0, en)}${nombre}()${texto.slice(en)}`,
    cursor: en + nombre.length + 1,
  }
}
