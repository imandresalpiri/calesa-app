// Los bloques que una guía ofrece al escribir «/» o pulsar «+»: su nombre, lo que dicen y las palabras con que se buscan. Sólo el catálogo y el
// orden de un bloque al moverlo; qué hace cada uno en el editor es de `features/contenido/editor`.

export type ClaveDeBloque =
  | 'parrafo'
  | 'titulo-grande'
  | 'titulo-chico'
  | 'lista'
  | 'lista-numerada'
  | 'cita'
  | 'imagen'
  | 'galeria'
  | 'boton'
  | 'video'
  | 'separador'

export type BloqueDeLaGuia = {
  clave: ClaveDeBloque
  etiqueta: string
  descripcion: string
  // Palabras extra que lo encuentran al escribir después de «/».
  palabras: string
}

export const BLOQUES_DE_LA_GUIA: readonly BloqueDeLaGuia[] = [
  { clave: 'parrafo', etiqueta: 'Párrafo', descripcion: 'Texto corrido.', palabras: 'texto' },
  {
    clave: 'titulo-grande',
    etiqueta: 'Título grande',
    descripcion: 'Abre una sección.',
    palabras: 'encabezado h2 titulo',
  },
  {
    clave: 'titulo-chico',
    etiqueta: 'Título chico',
    descripcion: 'Abre un apartado dentro de una sección.',
    palabras: 'encabezado h3 subtitulo',
  },
  {
    clave: 'lista',
    etiqueta: 'Lista con viñetas',
    descripcion: 'Puntos sin orden.',
    palabras: 'viñetas puntos',
  },
  {
    clave: 'lista-numerada',
    etiqueta: 'Lista numerada',
    descripcion: 'Pasos en orden.',
    palabras: 'pasos orden',
  },
  { clave: 'cita', etiqueta: 'Cita', descripcion: 'Una frase destacada.', palabras: 'frase' },
  {
    clave: 'imagen',
    etiqueta: 'Imagen',
    descripcion: 'Una foto desde tu equipo.',
    palabras: 'foto',
  },
  {
    clave: 'galeria',
    etiqueta: 'Galería',
    descripcion: 'De 1 a 12 fotos juntas.',
    palabras: 'fotos imagenes',
  },
  {
    clave: 'boton',
    etiqueta: 'Botón',
    descripcion: 'Un enlace con forma de botón.',
    palabras: 'enlace link',
  },
  {
    clave: 'video',
    etiqueta: 'Video',
    descripcion: 'Un enlace de YouTube o Vimeo.',
    palabras: 'youtube vimeo',
  },
  {
    clave: 'separador',
    etiqueta: 'Separador',
    descripcion: 'Una línea que corta el texto.',
    palabras: 'linea divisor',
  },
]

const sinTildes = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Los bloques que coinciden con lo escrito después de «/» (sin tildes ni mayúsculas); sin nada escrito, todos.
export function filtrarBloques(escrito: string): BloqueDeLaGuia[] {
  const buscado = sinTildes(escrito.trim())
  if (buscado === '') {
    return [...BLOQUES_DE_LA_GUIA]
  }
  return BLOQUES_DE_LA_GUIA.filter((bloque) =>
    sinTildes(`${bloque.etiqueta} ${bloque.palabras}`).includes(buscado),
  )
}

// El lugar que ocupa un bloque al subirlo o bajarlo una posición; `null` si ya está en el borde.
export function destinoAlMover(
  cantidad: number,
  indice: number,
  direccion: 'subir' | 'bajar',
): number | null {
  const destino = direccion === 'subir' ? indice - 1 : indice + 1
  return destino < 0 || destino >= cantidad || indice < 0 || indice >= cantidad ? null : destino
}
