// Los datos de ejemplo del editor de artes (docs/GLOSARIO.md › «Datos de ejemplo»): un vehículo y una cotización inventados con que se llenan
// las variables, las fotos del vehículo y la tarjeta de la cotización mientras se diseña. No tocan la base y no llevan montos. Las imágenes
// son estáticas y del mismo origen (`public/artes/ejemplo/`): el lienzo no queda «teñido» y exportar no falla. Puro.

export const DATOS_DE_EJEMPLO: Readonly<Record<string, string>> = {
  vehiculo: 'Toyota Hilux 2021',
  marca: 'Toyota',
  modelo: 'Hilux',
  anio: '2021',
  color: 'Blanco',
  kilometraje: '48.200 km',
  lote: 'Lote 1234',
  origen: 'Subasta',
  numero: 'COT-0042',
  asesor: 'Ana Rojas',
}

export type ImagenDeEjemplo = { src: string; ancho: number; alto: number }

export const FOTOS_DE_EJEMPLO: readonly ImagenDeEjemplo[] = [
  { src: '/artes/ejemplo/foto-1.svg', ancho: 1600, alto: 1067 },
  { src: '/artes/ejemplo/foto-2.svg', ancho: 1600, alto: 1067 },
  { src: '/artes/ejemplo/foto-3.svg', ancho: 1600, alto: 1067 },
]

export const TARJETA_DE_EJEMPLO: ImagenDeEjemplo = {
  src: '/artes/ejemplo/tarjeta.svg',
  ancho: 1080,
  alto: 1080,
}

// La foto de ejemplo de un índice: después de la tercera vuelve a empezar (la «Foto 4» se ve como la 1).
export function fotoDeEjemplo(indice: number): ImagenDeEjemplo {
  const cuantas = FOTOS_DE_EJEMPLO.length
  const vuelta = ((Math.trunc(indice) % cuantas) + cuantas) % cuantas
  const foto = FOTOS_DE_EJEMPLO[vuelta]
  if (!foto) {
    // Imposible: el índice ya está dentro de la lista.
    throw new Error(`No hay foto de ejemplo ${String(indice)}.`)
  }
  return foto
}
