import type { TextosDelCatalogo } from './tipos'

// Las frases que dependen del género y del número: «3 campos», «Sin preguntas», «Muévelos antes de quitarlo.».

export function usoDelElemento(n: number, textos: TextosDelCatalogo): string {
  if (n === 0) {
    return `Sin ${textos.item.varios}`
  }
  return n === 1 ? `1 ${textos.item.uno}` : `${String(n)} ${textos.item.varios}`
}

export function muevelosAntes(n: number, textos: TextosDelCatalogo): string {
  const items = textos.item.genero === 'm' ? 'lo' : 'la'
  const elemento = textos.articulo === 'el' ? 'lo' : 'la'
  return `Muéve${n === 1 ? items : `${items}s`} antes de quitar${elemento}.`
}

export function yaNoEsta(textos: TextosDelCatalogo): string {
  return `${textos.articulo === 'el' ? 'Ese' : 'Esa'} ${textos.elemento} ya no existe: recarga.`
}
