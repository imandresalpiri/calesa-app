// Lo que hace elegir una función en `fx ▾` de la barra de fórmula: con el texto vacío o sin «=», lo vuelve `=SUMA()`; con una fórmula, inserta `SUMA()` en el
// cursor. El cursor queda entre los paréntesis, listo para tocar las celdas. Puro.

export type TextoConCursor = { readonly texto: string; readonly cursor: number }

export function insertarFuncion(texto: string, cursor: number, nombre: string): TextoConCursor {
  const forma = `${nombre}()`
  if (!texto.trimStart().startsWith('=')) return { texto: `=${forma}`, cursor: forma.length }
  const en = Math.max(0, Math.min(cursor, texto.length))
  return {
    texto: `${texto.slice(0, en)}${forma}${texto.slice(en)}`,
    cursor: en + nombre.length + 1,
  }
}
