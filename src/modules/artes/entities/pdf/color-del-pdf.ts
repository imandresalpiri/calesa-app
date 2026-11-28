// Un color del documento (`#rrggbb` o `#rrggbbaa`) como lo pinta el PDF: el `#rrggbb` y su opacidad de 0 a 1, con la de la capa ya multiplicada.
// react-pdf no aplica la opacidad de un `View` a lo que lleva adentro, así que cada relleno, trazo, texto e imagen lleva la suya; es lo mismo que
// hace el lienzo, que pinta el relleno y el borde de una capa cada uno con su opacidad (`perfectDrawEnabled` apagado). Puro.

export type PinturaDelPdf = { color: string; opacidad: number }

const ALFA_MAXIMO = 255

export function pinturaDe(color: string, opacidadDeLaCapa = 1): PinturaDelPdf {
  const hex = color.toLowerCase()
  const alfa = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / ALFA_MAXIMO : 1
  return { color: hex.slice(0, 7), opacidad: alfa * opacidadDeLaCapa }
}

// Lo mismo para un color que puede faltar (sin relleno, sin borde): nulo sigue nulo.
export function pinturaOpcional(color: string | null, opacidadDeLaCapa = 1): PinturaDelPdf | null {
  return color === null ? null : pinturaDe(color, opacidadDeLaCapa)
}
