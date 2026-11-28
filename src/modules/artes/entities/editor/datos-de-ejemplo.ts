// Los datos de ejemplo del editor de artes (docs/GLOSARIO.md › «Datos de ejemplo»): el vehículo, la cotización y el lead inventados con que se
// llenan los elementos con datos mientras no hay un vehículo de ejemplo elegido; quien comparte y la empresa son siempre los de verdad (si no
// hay quien comparte, uno inventado). No tocan la base. Las imágenes son estáticas y del mismo origen (`public/artes/ejemplo/`): el lienzo no
// queda «teñido» y exportar no falla. Puro.
import type { AsesorDelArte, DatosDelArte, FijosDelArte } from '../datos/tipos'

const ID_DEL_EJEMPLO = '00000000-0000-4000-8000-000000000042'
const TARJETA_DE_EJEMPLO_SRC = '/artes/ejemplo/tarjeta.svg'

// Un jueves a media tarde en La Paz: la subasta y la hora del patio (Houston) se ven con su formato.
const CIERRE_DE_EJEMPLO = '2026-11-19T19:30:00.000Z'

// El cliente de los datos de ejemplo: también el de la vista previa de «Mensaje del portal» sin un lead de ejemplo elegido.
export const CLIENTE_DE_EJEMPLO = 'Carlos Méndez'

export const ASESOR_DE_EJEMPLO: AsesorDelArte = {
  nombre: 'Ana Rojas',
  cargo: 'Asesora comercial',
  whatsapp: '+591 70000000',
}

// `origen`: el nombre del origen de la plantilla de arte.
export function datosDelArteDeEjemplo({
  fijos,
  origen,
}: {
  fijos: FijosDelArte
  origen: string
}): DatosDelArte {
  return {
    deEjemplo: true,
    vehiculo: {
      id: ID_DEL_EJEMPLO,
      titulo: 'Toyota Hilux 2021',
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2021,
      color: 'Blanco',
      kilometraje: 48200,
      vin: '1HGCM82633A004352',
      lote: '1234',
      ubicacion: 'Houston, TX',
      enlace: 'https://www.ejemplo.com/lote/1234',
      origen,
      cierre: CIERRE_DE_EJEMPLO,
      zonaDelPatio: 'America/Chicago',
      ficha: {},
      fotos: [],
    },
    cotizacion: {
      id: ID_DEL_EJEMPLO,
      numero: 42,
      total: { conMoneda: 'USD 18.450,00', sinMoneda: '18.450,00' },
      modo: 'Oficial',
      venceEl: '2026-12-05',
      celdas: {},
      imagen: { src: TARJETA_DE_EJEMPLO_SRC, srcSinMoneda: TARJETA_DE_EJEMPLO_SRC },
    },
    lead: { nombre: CLIENTE_DE_EJEMPLO },
    asesor: fijos.asesor ?? ASESOR_DE_EJEMPLO,
    empresa: fijos.empresa,
  }
}

export type ImagenDeEjemplo = { src: string; ancho: number; alto: number }

export const FOTOS_DE_EJEMPLO: readonly ImagenDeEjemplo[] = [
  { src: '/artes/ejemplo/foto-1.svg', ancho: 1600, alto: 1067 },
  { src: '/artes/ejemplo/foto-2.svg', ancho: 1600, alto: 1067 },
  { src: '/artes/ejemplo/foto-3.svg', ancho: 1600, alto: 1067 },
]

export const TARJETA_DE_EJEMPLO: ImagenDeEjemplo = {
  src: TARJETA_DE_EJEMPLO_SRC,
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
