// Lo que hace elegir una función en `fx ▾` de la barra de fórmula: con el texto vacío, `=SUMA()`; con algo escrito sin «=» (el número de un valor fijo), lo
// envuelve, `=SUMA(100)`, para que la cifra no se pierda; con una fórmula, inserta `SUMA()` en el cursor. El cursor queda antes del paréntesis que cierra,
// listo para tocar las celdas. Puro.

export type TextoConCursor = { readonly texto: string; readonly cursor: number }

export function insertarFuncion(texto: string, cursor: number, nombre: string): TextoConCursor {
  if (!texto.trimStart().startsWith('=')) {
    const adentro = texto.trim()
    return { texto: `=${nombre}(${adentro})`, cursor: nombre.length + 2 + adentro.length }
  }
  const en = Math.max(0, Math.min(cursor, texto.length))
  return {
    texto: `${texto.slice(0, en)}${nombre}()${texto.slice(en)}`,
    cursor: en + nombre.length + 1,
  }
}
