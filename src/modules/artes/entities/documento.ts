// El documento de una plantilla de arte (docs/GLOSARIO.md › «Plantilla de arte»): un JSON propio y versionado, no el volcado de una librería de
// lienzo. Las medidas no van acá: son de la fila (`ancho`, `alto`), y el formato no cambia. El orden del arreglo de capas es el orden en que se
// dibujan. La base repite la forma mínima (`_artes_documento_valido()`), el tope de 512 KiB (`octet_length(documento::text)`, que manda: mide
// más que `JSON.stringify`) y las referencias a imágenes (`_artes_imagenes_del_documento()`). Hoy sólo se crea vacío; el editor de artes llena
// las capas. Puro.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

export const VERSION_DEL_DOCUMENTO = 1
export const TOPE_DEL_DOCUMENTO_EN_BYTES = 524288
export const MAXIMO_DE_PAGINAS = 20
export const MAXIMO_DE_CAPAS_POR_PAGINA = 500
export const MAXIMO_DE_IMAGENES_POR_PLANTILLA = 100

export const MENSAJE_DOCUMENTO_INVALIDO = 'La plantilla de arte no es válida.'
export const MENSAJE_DOCUMENTO_PESADO = 'La plantilla de arte pesa más de 512 KB.'
export const MENSAJE_DOCUMENTO_MAS_NUEVO =
  'Esta plantilla de arte se guardó con una versión más nueva de la app. Recarga.'
export const MENSAJE_DEMASIADAS_IMAGENES = `Una plantilla de arte usa hasta ${String(MAXIMO_DE_IMAGENES_POR_PLANTILLA)} imágenes distintas.`

const color = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
const idLocal = z.string().min(1).max(64)
const coordenada = z.number().finite()
const lado = z.number().finite().nonnegative()

const baseDeCapa = {
  id: idLocal,
  x: coordenada,
  y: coordenada,
  ancho: lado,
  alto: lado,
  rotacion: z.number().finite(),
  opacidad: z.number().min(0).max(1),
  bloqueada: z.boolean(),
  oculta: z.boolean(),
}

const capaDeTexto = z.object({
  ...baseDeCapa,
  tipo: z.literal('texto'),
  texto: z.string().max(5000),
  fuente: z.string().min(1).max(80),
  tamano: z.number().finite().positive(),
  color,
  alineacion: z.enum(['izquierda', 'centro', 'derecha']),
})

const capaDeImagen = z.object({
  ...baseDeCapa,
  tipo: z.literal('imagen'),
  // Una imagen de la biblioteca, por referencia: nunca su archivo.
  imagenId: z.guid(),
  ajuste: z.enum(['cubrir', 'contener']),
})

const capaDeForma = z.object({
  ...baseDeCapa,
  tipo: z.literal('forma'),
  forma: z.enum(['rectangulo', 'elipse', 'linea']),
  relleno: color.nullable(),
  borde: color.nullable(),
  grosor: lado,
})

const capaDeLogo = z.object({
  ...baseDeCapa,
  tipo: z.literal('logo'),
  // Una variante del logo de la empresa; sin ella, el logo principal.
  varianteId: z.string().min(1).max(64).nullable(),
})

export const esquemaDeCapa = z.discriminatedUnion('tipo', [
  capaDeTexto,
  capaDeImagen,
  capaDeForma,
  capaDeLogo,
])
export type CapaDeArte = z.infer<typeof esquemaDeCapa>

const esquemaDelFondo = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('color'), color }),
  z.object({
    tipo: z.literal('degradado'),
    desde: color,
    hasta: color,
    angulo: z.number().finite(),
  }),
])

const esquemaDeLaPagina = z.object({
  id: idLocal,
  fondo: esquemaDelFondo,
  capas: z.array(esquemaDeCapa).max(MAXIMO_DE_CAPAS_POR_PAGINA),
})

export const esquemaDelDocumento = z.object({
  version: z.number().int().min(1).max(VERSION_DEL_DOCUMENTO),
  paginas: z.array(esquemaDeLaPagina).min(1).max(MAXIMO_DE_PAGINAS),
})
export type DocumentoDeArte = z.infer<typeof esquemaDelDocumento>

// Con lo que nace una plantilla de arte: una página blanca, sin capas.
export function documentoVacio(): DocumentoDeArte {
  return {
    version: VERSION_DEL_DOCUMENTO,
    paginas: [{ id: 'pagina-1', fondo: { tipo: 'color', color: '#ffffff' }, capas: [] }],
  }
}

// Lleva un documento de una versión vieja a la actual. Con una sola versión, es la identidad: cada versión nueva suma aquí su paso.
export function migrarDocumento(crudo: { version: number } & Record<string, unknown>): unknown {
  return crudo
}

function versionDe(crudo: unknown): number | null {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) {
    return null
  }
  const version = (crudo as { version?: unknown }).version
  return typeof version === 'number' && Number.isInteger(version) ? version : null
}

// Lee el documento que guardó la base. Una versión mayor que la de esta app se rechaza con su texto (no se pisa lo que no se entiende); sin
// versión, o menor que 1, es un documento inválido.
export function leerDocumento(crudo: unknown): Resultado<DocumentoDeArte> {
  const version = versionDe(crudo)
  if (version === null || version < 1) {
    return fallo('validacion', MENSAJE_DOCUMENTO_INVALIDO)
  }
  if (version > VERSION_DEL_DOCUMENTO) {
    return fallo('validacion', MENSAJE_DOCUMENTO_MAS_NUEVO)
  }
  const leido = esquemaDelDocumento.safeParse(
    migrarDocumento(crudo as { version: number } & Record<string, unknown>),
  )
  return leido.success ? ok(leido.data) : fallo('validacion', MENSAJE_DOCUMENTO_INVALIDO)
}

// Lo que pesa al guardarse, en bytes UTF-8. La base mide su `jsonb::text`, que es algo mayor: ella tiene la última palabra.
export function pesoDelDocumento(documento: DocumentoDeArte): number {
  return new TextEncoder().encode(JSON.stringify(documento)).length
}

// Las imágenes de la biblioteca que usa, sin repetir, en el orden en que aparecen.
export function imagenesDelDocumento(documento: DocumentoDeArte): string[] {
  const ids = documento.paginas.flatMap((pagina) =>
    pagina.capas.flatMap((capa) => (capa.tipo === 'imagen' ? [capa.imagenId] : [])),
  )
  return [...new Set(ids)]
}

// Lo que se comprueba antes de mandar un documento a la base: la forma, el tope de peso y el de imágenes distintas.
export function validarDocumento(crudo: unknown): Resultado<DocumentoDeArte> {
  const leido = leerDocumento(crudo)
  if (!leido.ok) {
    return leido
  }
  if (pesoDelDocumento(leido.data) > TOPE_DEL_DOCUMENTO_EN_BYTES) {
    return fallo('validacion', MENSAJE_DOCUMENTO_PESADO)
  }
  if (imagenesDelDocumento(leido.data).length > MAXIMO_DE_IMAGENES_POR_PLANTILLA) {
    return fallo('validacion', MENSAJE_DEMASIADAS_IMAGENES)
  }
  return leido
}
