// Las herramientas del riel del editor de artes: en qué orden van, cómo se llaman y su letra. La letra se lee de `accionDeLaTecla()`: la tabla
// de atajos es la única que dice qué letra elige qué herramienta (polígono e imagen no tienen). En sólo lectura se usan sólo las que miran
// (mover y mano). Puro.
import { accionDeLaTecla, type HerramientaDelEditor } from './atajos'

export const HERRAMIENTAS_DEL_RIEL: readonly HerramientaDelEditor[] = [
  'mover',
  'mano',
  'texto',
  'rectangulo',
  'elipse',
  'linea',
  'poligono',
  'pluma',
  'imagen',
]

export const NOMBRE_DE_LA_HERRAMIENTA: Readonly<Record<HerramientaDelEditor, string>> = {
  mover: 'Mover',
  mano: 'Mano',
  texto: 'Texto',
  rectangulo: 'Rectángulo',
  elipse: 'Elipse',
  linea: 'Línea',
  poligono: 'Polígono',
  pluma: 'Pluma',
  imagen: 'Imagen',
}

const DE_SOLO_LECTURA: ReadonlySet<HerramientaDelEditor> = new Set(['mover', 'mano'])

const LETRAS = [...'abcdefghijklmnopqrstuvwxyz']

// La letra que la elige, en mayúscula («R»); nula si no tiene.
export function letraDeLaHerramienta(herramienta: HerramientaDelEditor): string | null {
  const letra = LETRAS.find((l) => {
    const accion = accionDeLaTecla(
      {
        key: l,
        code: `Key${l.toUpperCase()}`,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        repeat: false,
      },
      'bajar',
    )
    return accion?.tipo === 'herramienta' && accion.herramienta === herramienta
  })
  return letra === undefined ? null : letra.toUpperCase()
}

// El título del botón del riel: «Rectángulo (R)», o sólo el nombre si no tiene letra.
export function tituloDeLaHerramienta(herramienta: HerramientaDelEditor): string {
  const nombre = NOMBRE_DE_LA_HERRAMIENTA[herramienta]
  const letra = letraDeLaHerramienta(herramienta)
  return letra === null ? nombre : `${nombre} (${letra})`
}

export function seUsaEnSoloLectura(herramienta: HerramientaDelEditor): boolean {
  return DE_SOLO_LECTURA.has(herramienta)
}
