// Los pasos que llevan un documento de arte de una versión vieja a la actual (al abrirlo: `leerDocumento()`). Cada versión nueva suma acá su
// paso y el esquema con que se leía la anterior; lo que no pasa ese esquema vuelve tal cual (y la lectura lo rechaza como inválido). Puro.
import { z } from 'zod'

const color = z.string()
const baseV1 = {
  id: z.string(),
  x: z.number(),
  y: z.number(),
  ancho: z.number(),
  alto: z.number(),
  rotacion: z.number(),
  opacidad: z.number(),
  bloqueada: z.boolean(),
  oculta: z.boolean(),
}

const capaV1 = z.discriminatedUnion('tipo', [
  z.looseObject({
    ...baseV1,
    tipo: z.literal('texto'),
    texto: z.string(),
    fuente: z.string(),
    tamano: z.number(),
    color,
    alineacion: z.string(),
  }),
  z.looseObject({ ...baseV1, tipo: z.literal('imagen'), imagenId: z.string(), ajuste: z.string() }),
  z.looseObject({
    ...baseV1,
    tipo: z.literal('forma'),
    forma: z.enum(['rectangulo', 'elipse', 'linea']),
    relleno: color.nullable(),
    borde: color.nullable(),
    grosor: z.number(),
  }),
  z.looseObject({ ...baseV1, tipo: z.literal('logo'), varianteId: z.string().nullable() }),
])
type CapaV1 = z.infer<typeof capaV1>

const documentoV1 = z.looseObject({
  version: z.literal(1),
  paginas: z.array(z.looseObject({ capas: z.array(capaV1) })),
})

const SIN_MARCO = { radio: 0, borde: null, grosor: 0 }
const NEGRO = '#000000'

// Lo que v2 suma a toda capa, y a cada tipo. La línea de v1 era una forma: pasa a ser una capa `linea` horizontal por el medio de su caja.
function capaDeV1aV2(capa: CapaV1): Record<string, unknown> {
  const base = { ...capa, nombre: null, grupoId: null, sombra: null }
  switch (capa.tipo) {
    case 'texto':
      return { ...base, peso: 400, interlineado: 1.2, borde: null, grosor: 0 }
    case 'imagen':
    case 'logo':
      return { ...base, ...SIN_MARCO }
    case 'forma': {
      if (capa.forma !== 'linea') {
        return { ...base, lados: null, radio: 0 }
      }
      const { forma: _forma, relleno, borde, grosor, ...resto } = capa
      return {
        ...resto,
        nombre: null,
        grupoId: null,
        sombra: null,
        tipo: 'linea',
        puntos: [
          { x: 0, y: capa.alto / 2 },
          { x: capa.ancho, y: capa.alto / 2 },
        ],
        borde: borde ?? relleno ?? NEGRO,
        grosor: Math.max(grosor, 1),
      }
    }
  }
}

function deV1aV2(crudo: unknown): unknown {
  const leido = documentoV1.safeParse(crudo)
  if (!leido.success) {
    return crudo
  }
  return {
    ...leido.data,
    version: 2,
    paginas: leido.data.paginas.map((pagina) => ({
      ...pagina,
      capas: pagina.capas.map(capaDeV1aV2),
      grupos: [],
    })),
  }
}

const PASOS: Readonly<Record<number, (crudo: unknown) => unknown>> = { 1: deV1aV2 }

// Aplica los pasos desde la versión del documento hasta la actual, uno tras otro. Una versión sin paso (la actual) queda como está.
export function migrarDocumento(crudo: unknown): unknown {
  let actual = crudo
  for (;;) {
    const version =
      typeof actual === 'object' && actual !== null
        ? (actual as { version?: unknown }).version
        : undefined
    const paso = typeof version === 'number' ? PASOS[version] : undefined
    if (!paso) {
      return actual
    }
    const siguiente = paso(actual)
    if (siguiente === actual) {
      return actual
    }
    actual = siguiente
  }
}
