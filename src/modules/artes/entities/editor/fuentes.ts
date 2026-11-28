// Las fuentes que ofrece el editor de artes para un texto y los nombres de sus pesos. `geist` es la letra de la app: next/font le cambia el
// nombre de la familia por uno con hash, así que el lienzo la resuelve en el navegador desde `--font-geist-sans` (por eso su familia es nula).
// Las demás son de sistema, con su respaldo genérico. Un formato de PDF ofrece sólo Geist y la dibuja desde los mismos TTF que lee el PDF
// (`FUENTE_DEL_PDF`): un texto se parte y se mide igual en el lienzo y en el PDF. Puro.
import type { PESOS_DE_TEXTO } from '../documento'
import type { TipoDeArte } from '../formatos'

export type FuenteDeArte = { clave: string; nombre: string; familia: string | null }

export const FUENTE_POR_DEFECTO = 'geist'

const GEIST: FuenteDeArte = { clave: FUENTE_POR_DEFECTO, nombre: 'Geist', familia: null }

export const FUENTES_DE_ARTE: readonly FuenteDeArte[] = [
  GEIST,
  { clave: 'arial', nombre: 'Arial', familia: 'Arial, Helvetica, sans-serif' },
  { clave: 'georgia', nombre: 'Georgia', familia: 'Georgia, serif' },
  { clave: 'courier-new', nombre: 'Courier New', familia: "'Courier New', Courier, monospace" },
  { clave: 'verdana', nombre: 'Verdana', familia: 'Verdana, Geneva, sans-serif' },
]

// La fuente de una clave; una que no está (de un documento viejo o de otra versión) cae a la por defecto.
export function fuenteDe(clave: string): FuenteDeArte {
  return FUENTES_DE_ARTE.find((fuente) => fuente.clave === clave) ?? GEIST
}

export type PesoDeTexto = (typeof PESOS_DE_TEXTO)[number]

// La Geist de un arte de PDF: los TTF estáticos del release v1.9.2 en `public/fuentes/geist/` (los sha256, en `docs/DECISIONES.md`), uno por
// peso. El lienzo los carga como `FontFace` de la familia `familia` desde `carpeta`; el servidor los registra en react-pdf y los mide por su ruta
// (`public` + `carpeta`). La Geist variable de la app no sirve: sus medidas no son las de los TTF.
export const FUENTE_DEL_PDF = {
  familia: 'Geist del PDF',
  carpeta: '/fuentes/geist',
  archivos: {
    400: 'Geist-Regular.ttf',
    500: 'Geist-Medium.ttf',
    600: 'Geist-SemiBold.ttf',
    700: 'Geist-Bold.ttf',
  } satisfies Readonly<Record<PesoDeTexto, string>>,
} as const

// El ascenso y el descenso de esos TTF, en fracciones del tamaño (`hhea`, igual que `OS/2` con `USE_TYPO_METRICS`: lo que el navegador da como
// `fontBoundingBoxAscent` y `fontBoundingBoxDescent`). Los cuatro pesos miden lo mismo.
export const METRICAS_DE_GEIST = { ascenso: 1.005, descenso: 0.295 } as const

// La `font-family` del lienzo de un arte de PDF, con su respaldo.
export const FAMILIA_DEL_PDF = `"${FUENTE_DEL_PDF.familia}", sans-serif`

// Lo que ofrece el inspector en cada tipo de formato: en un PDF, sólo Geist.
export function fuentesDelFormato(tipo: TipoDeArte): readonly FuenteDeArte[] {
  return tipo === 'pdf' ? [GEIST] : FUENTES_DE_ARTE
}

// La fuente con que se dibuja una capa: en un PDF, siempre Geist (una capa con otra fuente se dibuja como Geist en el lienzo y en el PDF).
export function fuenteDelFormato(clave: string, tipo: TipoDeArte): FuenteDeArte {
  return tipo === 'pdf' ? GEIST : fuenteDe(clave)
}

export const NOMBRES_DE_LOS_PESOS: Readonly<Record<PesoDeTexto, string>> = {
  400: 'Normal',
  500: 'Media',
  600: 'Seminegrita',
  700: 'Negrita',
}
