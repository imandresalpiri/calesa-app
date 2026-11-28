// El documento de una plantilla de arte (docs/GLOSARIO.md › «Plantilla de arte»): un JSON propio y versionado, no el volcado de una librería de
// lienzo (`stage.toJSON()` no guarda imágenes y hornearía las clases de Konva). Las medidas no van acá: son de la fila (`ancho`, `alto`), y el
// formato no cambia. El orden del arreglo de capas es el orden en que se dibujan (la última, adelante). La base repite la forma mínima
// (`_artes_documento_valido()`), el tope de 512 KiB (`octet_length(documento::text)`, que manda: mide más que `JSON.stringify`) y las
// referencias a imágenes (`_artes_imagenes_del_documento()`, que las busca en `paginas[*].capas[*]`: los grupos son planos para que sigan ahí).
// Cota: 300 capas y 100 grupos por página, 200 nodos por trazo, 512 KiB; el editor guarda hasta 100 pasos de historial. Puro.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  color,
  esquemaDeCapa,
  idLocal,
  LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA,
} from './capas-del-documento'
import { migrarDocumento } from './migraciones-del-documento'

export * from './capas-del-documento'

export const VERSION_DEL_DOCUMENTO = 2
export const TOPE_DEL_DOCUMENTO_EN_BYTES = 524288
export const MAXIMO_DE_PAGINAS = 20
export const MAXIMO_DE_CAPAS_POR_PAGINA = 300
export const MAXIMO_DE_GRUPOS_POR_PAGINA = 100
export const MAXIMO_DE_IMAGENES_POR_PLANTILLA = 100

export const MENSAJE_DOCUMENTO_INVALIDO = 'La plantilla de arte no es válida.'
export const MENSAJE_DOCUMENTO_PESADO = 'La plantilla de arte pesa más de 512 KB.'
export const MENSAJE_DOCUMENTO_MAS_NUEVO =
  'Esta plantilla de arte se guardó con una versión más nueva de la app. Recarga.'
export const MENSAJE_DEMASIADAS_IMAGENES = `Una plantilla de arte usa hasta ${String(MAXIMO_DE_IMAGENES_POR_PLANTILLA)} imágenes distintas.`

const esquemaDelFondo = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('color'), color }),
  z.object({
    tipo: z.literal('degradado'),
    desde: color,
    hasta: color,
    angulo: z.number().finite(),
  }),
])
export type FondoDeArte = z.infer<typeof esquemaDelFondo>

export const esquemaDelGrupo = z.object({
  id: idLocal,
  nombre: z.string().min(1).max(LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA),
  oculto: z.boolean(),
  bloqueado: z.boolean(),
})
export type GrupoDeCapas = z.infer<typeof esquemaDelGrupo>

// Los ids de capas y grupos no se repiten en la página; cada `grupoId` nombra un grupo de la página y sus miembros van seguidos.
function revisarLaPagina(
  pagina: { capas: { id: string; grupoId: string | null }[]; grupos: { id: string }[] },
  contexto: z.RefinementCtx,
): void {
  const ids = [...pagina.capas.map((c) => c.id), ...pagina.grupos.map((g) => g.id)]
  if (new Set(ids).size !== ids.length) {
    contexto.addIssue({ code: 'custom', message: 'Un id se repite.' })
  }
  const grupos = new Set(pagina.grupos.map((g) => g.id))
  const cerrados = new Set<string>()
  let anterior: string | null = null
  for (const capa of pagina.capas) {
    if (capa.grupoId !== anterior && anterior !== null) {
      cerrados.add(anterior)
    }
    if (capa.grupoId !== null && (!grupos.has(capa.grupoId) || cerrados.has(capa.grupoId))) {
      contexto.addIssue({ code: 'custom', message: 'Un grupo no es válido.' })
      return
    }
    anterior = capa.grupoId
  }
}

const esquemaDeLaPagina = z
  .object({
    id: idLocal,
    fondo: esquemaDelFondo,
    capas: z.array(esquemaDeCapa).max(MAXIMO_DE_CAPAS_POR_PAGINA),
    grupos: z.array(esquemaDelGrupo).max(MAXIMO_DE_GRUPOS_POR_PAGINA),
  })
  .superRefine(revisarLaPagina)
export type PaginaDeArte = z.infer<typeof esquemaDeLaPagina>

export const esquemaDelDocumento = z.object({
  version: z.literal(VERSION_DEL_DOCUMENTO),
  paginas: z.array(esquemaDeLaPagina).min(1).max(MAXIMO_DE_PAGINAS),
})
export type DocumentoDeArte = z.infer<typeof esquemaDelDocumento>

// Con lo que nace una plantilla de arte: una página blanca, sin capas.
export function documentoVacio(): DocumentoDeArte {
  return {
    version: VERSION_DEL_DOCUMENTO,
    paginas: [
      { id: 'pagina-1', fondo: { tipo: 'color', color: '#ffffff' }, capas: [], grupos: [] },
    ],
  }
}

function versionDe(crudo: unknown): number | null {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) {
    return null
  }
  const version = (crudo as { version?: unknown }).version
  return typeof version === 'number' && Number.isInteger(version) ? version : null
}

// Lee el documento que guardó la base y lo lleva a la versión actual (`migrarDocumento()`). Una versión mayor que la de esta app se rechaza
// con su texto (no se pisa lo que no se entiende); sin versión, o menor que 1, es un documento inválido.
export function leerDocumento(crudo: unknown): Resultado<DocumentoDeArte> {
  const version = versionDe(crudo)
  if (version === null || version < 1) {
    return fallo('validacion', MENSAJE_DOCUMENTO_INVALIDO)
  }
  if (version > VERSION_DEL_DOCUMENTO) {
    return fallo('validacion', MENSAJE_DOCUMENTO_MAS_NUEVO)
  }
  const leido = esquemaDelDocumento.safeParse(migrarDocumento(crudo))
  return leido.success ? ok(leido.data) : fallo('validacion', MENSAJE_DOCUMENTO_INVALIDO)
}

// Lo que pesa al guardarse, en bytes UTF-8. La base mide su `jsonb::text`, que es algo mayor: ella tiene la última palabra.
export function pesoDelDocumento(documento: DocumentoDeArte): number {
  return new TextEncoder().encode(JSON.stringify(documento)).length
}

// Las imágenes de la biblioteca que usa, sin repetir (el mismo id en mayúsculas es la misma), en el orden en que aparecen; también las que van
// dentro de un grupo (los grupos son planos). Espejo de `_artes_imagenes_del_documento()`.
export function imagenesDelDocumento(documento: DocumentoDeArte): string[] {
  const ids = documento.paginas.flatMap((pagina) =>
    pagina.capas.flatMap((capa) => (capa.tipo === 'imagen' ? [capa.imagenId.toLowerCase()] : [])),
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
