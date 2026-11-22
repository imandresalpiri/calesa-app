// La negrita de un texto de la ayuda (docs/GLOSARIO.md › «Bloque de la ayuda»): `**así**`. Los `**` se aparean de a dos, de izquierda a derecha, y uno sin pareja se
// muestra tal cual. Sin HTML: la pantalla dibuja cada parte y la de negrita va en `<strong>`. La base sólo cuida el largo: la marca no puede romper nada.
export type ParteDelTexto = { texto: string; negrita: boolean }

const MARCA = '**'

// Junta con la anterior si las dos son iguales y no suma lo vacío (una negrita sin nada adentro no dibuja nada).
function sumar(partes: ParteDelTexto[], texto: string, negrita: boolean): void {
  if (texto === '') {
    return
  }
  const anterior = partes.at(-1)
  if (anterior?.negrita === negrita) {
    anterior.texto += texto
    return
  }
  partes.push({ texto, negrita })
}

export function partesDelTexto(texto: string): ParteDelTexto[] {
  const trozos = texto.split(MARCA)
  // Con una cantidad impar de marcas, la última no tiene pareja: lo que la sigue es texto y la marca vuelve con él.
  const sinPareja = trozos.length % 2 === 0
  const partes: ParteDelTexto[] = []
  trozos.forEach((trozo, i) => {
    if (sinPareja && i === trozos.length - 1) {
      sumar(partes, `${MARCA}${trozo}`, false)
      return
    }
    sumar(partes, trozo, i % 2 === 1)
  })
  return partes
}
