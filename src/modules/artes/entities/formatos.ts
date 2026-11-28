// Los formatos de arte (docs/GLOSARIO.md › «Formato de arte»): la medida del lienzo de una plantilla de arte y si sale como imagen o como PDF.
// Texto fijo en código, no catálogo de la base: la base repite cada medida en `_artes_medidas_validas()` y
// `scripts/guardas/formatos-de-arte.test.ts` compara las dos copias. Un PDF se mide en puntos (72 por pulgada), la unidad de
// `@react-pdf/renderer`; una imagen, en píxeles. Puro.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

export type TipoDeArte = 'imagen' | 'pdf'
export type UnidadDelFormato = 'px' | 'pt'

export const LADO_MINIMO_PERSONALIZADO = 320
export const LADO_MAXIMO_PERSONALIZADO = 4096

export const CLAVES_DE_FORMATO = [
  'cuadrado',
  'vertical',
  'historia',
  'horizontal',
  'pantalla',
  'personalizado',
  'carta',
  'a4',
] as const
export type ClaveDeFormato = (typeof CLAVES_DE_FORMATO)[number]

export type FormatoDeArte = {
  clave: ClaveDeFormato
  nombre: string
  tipo: TipoDeArte
  unidad: UnidadDelFormato
  // Nulos sólo en «Personalizado»: las medidas las elige quien crea.
  ancho: number | null
  alto: number | null
}

export const FORMATOS_DE_ARTE: readonly FormatoDeArte[] = [
  { clave: 'cuadrado', nombre: 'Cuadrado', tipo: 'imagen', unidad: 'px', ancho: 1080, alto: 1080 },
  { clave: 'vertical', nombre: 'Vertical', tipo: 'imagen', unidad: 'px', ancho: 1080, alto: 1350 },
  { clave: 'historia', nombre: 'Historia', tipo: 'imagen', unidad: 'px', ancho: 1080, alto: 1920 },
  {
    clave: 'horizontal',
    nombre: 'Horizontal',
    tipo: 'imagen',
    unidad: 'px',
    ancho: 1200,
    alto: 630,
  },
  { clave: 'pantalla', nombre: 'Pantalla', tipo: 'imagen', unidad: 'px', ancho: 1920, alto: 1080 },
  {
    clave: 'personalizado',
    nombre: 'Personalizado',
    tipo: 'imagen',
    unidad: 'px',
    ancho: null,
    alto: null,
  },
  { clave: 'carta', nombre: 'Carta', tipo: 'pdf', unidad: 'pt', ancho: 612, alto: 792 },
  { clave: 'a4', nombre: 'A4', tipo: 'pdf', unidad: 'pt', ancho: 595, alto: 842 },
]

export const MENSAJE_DEL_LADO_PERSONALIZADO = `Cada lado va de ${String(LADO_MINIMO_PERSONALIZADO)} a ${String(LADO_MAXIMO_PERSONALIZADO)} px.`

const POR_CLAVE: ReadonlyMap<string, FormatoDeArte> = new Map(
  FORMATOS_DE_ARTE.map((f) => [f.clave, f]),
)

export function esClaveDeFormato(valor: string): valor is ClaveDeFormato {
  return POR_CLAVE.has(valor)
}

export function formatoDe(clave: ClaveDeFormato): FormatoDeArte {
  const formato = POR_CLAVE.get(clave)
  if (!formato) {
    // Imposible mientras la clave salga de `CLAVES_DE_FORMATO`: lo exige el tipo.
    throw new Error(`El formato de arte ${clave} no existe.`)
  }
  return formato
}

export function tipoDelFormato(clave: ClaveDeFormato): TipoDeArte {
  return formatoDe(clave).tipo
}

export type Medidas = { ancho: number; alto: number }

function ladoValido(lado: number): boolean {
  return (
    Number.isInteger(lado) && lado >= LADO_MINIMO_PERSONALIZADO && lado <= LADO_MAXIMO_PERSONALIZADO
  )
}

// Las medidas con que nace una plantilla de arte: las del formato, o las elegidas si es «Personalizado» (enteras, de 320 a 4096 por lado).
export function medidasDelFormato(
  clave: ClaveDeFormato,
  personalizado?: Medidas | null,
): Resultado<Medidas> {
  const formato = formatoDe(clave)
  if (formato.ancho !== null && formato.alto !== null) {
    return ok({ ancho: formato.ancho, alto: formato.alto })
  }
  if (!personalizado || !ladoValido(personalizado.ancho) || !ladoValido(personalizado.alto)) {
    return fallo('validacion', MENSAJE_DEL_LADO_PERSONALIZADO)
  }
  return ok({ ancho: personalizado.ancho, alto: personalizado.alto })
}

// Cómo se nombra el formato de una plantilla de arte en su tarjeta: «Vertical · 1080 × 1350», «A4 · PDF».
export function textoDelFormato(clave: ClaveDeFormato, medidas: Medidas): string {
  const formato = formatoDe(clave)
  if (formato.tipo === 'pdf') {
    return `${formato.nombre} · PDF`
  }
  return `${formato.nombre} · ${String(medidas.ancho)} × ${String(medidas.alto)}`
}

// «imagen» o «PDF», como se dice en «Usar por defecto para imagen».
export function nombreDelTipo(tipo: TipoDeArte): string {
  return tipo === 'pdf' ? 'PDF' : 'imagen'
}
