// Los nodos de la fórmula (docs/COTIZADOR.md › «Forma»): un Zod por tipo, discriminado por `tipo` (y
// `calculo`, a su vez, por `op`). Cada objeto es estricto: una clave mal escrita es un error, no se
// ignora. Lo que se valida mirando un solo valor vive acá; lo que cruza nodos, en `validar.ts`.
import { z } from 'zod'

// El id de un nodo, un grupo, un bucket, una opción o un tono: el patrón de `validar_formula()`.
export const esquemaId = z.string().regex(/^[a-z][a-z0-9_]{0,40}$/)
// Un campo del vehículo (`anio`, `cilindrada`): un `match` que no nombra un nodo es esto. El patrón admite puntos a propósito:
// `validarFormula()` los rechaza con su propia regla (`campo_con_punto`) y no como `forma`.
export const esquemaCampo = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/)

export const FORMATOS = ['usd', 'pct', 'raw', 'moneda'] as const
export const SALIDAS = ['total', 'base_imponible', 'aparte'] as const
const COLORES = ['amarillo', 'verde', 'naranja'] as const

export type Formato = (typeof FORMATOS)[number]

const texto = (max: number) => z.string().min(1).max(max)

// Los «Decimales» de una celda van de 0 a este tope (el de `_formula_forma_nodo()`).
export const MAXIMO_DE_DECIMALES = 4

// El texto con que se escribió una fila (`=(remate+fees)*4%`), para que el editor lo muestre y lo recompile. Lo lleva la raíz que
// compila `compilarExpresion()` (una `constante` o un `calculo`); el compilador no lo lee ni lo escribe. Se cuenta en caracteres,
// como `char_length` de `validar_formula()`.
export const MAXIMO_DE_TEXTO = 2000
const deTexto = { texto: texto(MAXIMO_DE_TEXTO).optional() }

// Lo que todo nodo puede llevar. `seccion` y `color` son de la Fase 0: el diseño (4.08) los reemplaza.
const base = {
  id: esquemaId,
  etiqueta: texto(80),
  formato: z.enum(FORMATOS).optional(),
  // Los «Decimales» con que se muestra la celda (glosario): de 0 a 4; sin la clave, «Automático». Sólo la vista: el motor no la lee. Va justo
  // después de `formato`, como su espejo en `_formula_forma_nodo()` (el primer rechazo cae en la misma ruta).
  decimales: z.int().min(0).max(MAXIMO_DE_DECIMALES).optional(),
  descripcion: z.string().max(300).optional(),
  seccion: texto(60).optional(),
  color: z.enum(COLORES).optional(),
  salida: z.enum(SALIDAS).optional(),
  // Sólo en una fórmula sin `grupos` (la forma de la Fase 0). `ninguno` = sin bucket.
  bucket: esquemaId.optional(),
  grupo: esquemaId.optional(),
}
// Lo que un nodo de valor suma: la variante y el interruptor que lo habilita.
const deValor = {
  ...base,
  solo_en: z.array(esquemaId).min(1).optional(),
  condicion: esquemaId.optional(),
}
const sobrescribible = { sobrescribible: z.boolean().optional() }

const esquemaInput = z.strictObject({
  ...deValor,
  tipo: z.literal('input'),
  sugerido_de: esquemaId.optional(),
  requerido_si: esquemaId.optional(),
})
// `tablas` es la clave de `params` donde van las filas congeladas (D5): ninguna constante se llama así.
const esquemaConstante = z.strictObject({
  ...deValor,
  ...deTexto,
  id: esquemaId.refine((id) => id !== 'tablas', {
    error: '«tablas» es una clave reservada de params',
  }),
  tipo: z.literal('constante'),
})
// Un tipo de cambio y la variante no dependen de otra variante ni de un interruptor.
const esquemaTipoCambio = z.strictObject({
  ...base,
  tipo: z.literal('tipo_cambio'),
  clave: esquemaId,
})
const esquemaCampoVehiculo = z.strictObject({
  ...base,
  solo_en: deValor.solo_en,
  tipo: z.literal('campo_vehiculo'),
  campo: esquemaCampo,
})
const esquemaBandera = z.strictObject({
  ...base,
  solo_en: deValor.solo_en,
  tipo: z.literal('bandera'),
})
const esquemaOpcionDeVariante = z.strictObject({
  clave: esquemaId,
  etiqueta: texto(60),
  titulo: texto(120),
})
const esquemaOpcion = z.strictObject({
  ...base,
  tipo: z.literal('opcion'),
  opciones: z.array(esquemaOpcionDeVariante).min(2),
  por_defecto: esquemaId.optional(),
  // «Se cotiza en par» (glosario: «Variante en par»): sin la clave, la de siempre. Exactamente dos opciones (`par_sin_dos_opciones`).
  en_par: z.boolean().optional(),
})
const esquemaTabla = z.strictObject({
  ...deValor,
  ...sobrescribible,
  tipo: z.literal('tabla'),
  tabla: esquemaId,
  // columna de la tabla → un nodo anterior con ese id o, si no hay, un campo del vehículo.
  match: z.record(esquemaId, esquemaCampo),
  columna: esquemaId,
})
const esquemaTramo = z.strictObject({
  ...deValor,
  ...sobrescribible,
  tipo: z.literal('tramo'),
  tabla: esquemaId,
  sobre: esquemaId,
  columna: esquemaId,
})

// `calculo`, con la aridad de cada operación cerrada.
const deCalculo = { ...deValor, ...sobrescribible, ...deTexto, tipo: z.literal('calculo') }
const uno = z.tuple([esquemaId])

// Cómo compara `comparar` sus dos términos y `es_opcion` la variante con una clave (docs/COTIZADOR.md › «Los nodos»).
export const COMPARADORES = ['>', '<', '>=', '<=', '=', '<>'] as const
export const COMPARADORES_DE_OPCION = ['=', '<>'] as const
export type Comparador = (typeof COMPARADORES)[number]
// Las operaciones que valen 1 o 0 y por eso sirven de condición (`prueba`) de un `elegir`, un `y` o un `o`; una bandera también sirve.
export const OPS_DE_CONDICION = ['comparar', 'es_opcion', 'y', 'o'] as const
const esquemaCalculo = z.discriminatedUnion('op', [
  z.strictObject({ ...deCalculo, op: z.literal('suma'), de: z.array(esquemaId).min(1) }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('porcentaje_de'),
    de: z.array(esquemaId).min(1),
    pct: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('multiplicar'), de: z.array(esquemaId).min(2) }),
  z.strictObject({ ...deCalculo, op: z.literal('restar'), de: z.array(esquemaId).min(2) }),
  z.strictObject({ ...deCalculo, op: z.literal('dividir'), de: z.tuple([esquemaId, esquemaId]) }),
  z.strictObject({ ...deCalculo, op: z.literal('si'), de: uno, condicion: esquemaId }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('depreciar'),
    de: uno,
    tabla: esquemaId,
    sobre: esquemaId,
    columna: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('redondear'), de: uno, n: z.int().min(0).max(6) }),
  // Las claves propias de las operaciones de condición van después de `de`, como sus checks en `_formula_forma_nodo()`.
  z.strictObject({
    ...deCalculo,
    op: z.literal('comparar'),
    de: z.tuple([esquemaId, esquemaId]),
    cmp: z.enum(COMPARADORES),
  }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('es_opcion'),
    de: uno,
    cmp: z.enum(COMPARADORES_DE_OPCION),
    clave: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('y'), de: z.array(esquemaId).min(2) }),
  z.strictObject({ ...deCalculo, op: z.literal('o'), de: z.array(esquemaId).min(2) }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('elegir'),
    de: z.array(esquemaId).min(1).max(2),
    prueba: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('max'), de: z.array(esquemaId).min(1) }),
  z.strictObject({ ...deCalculo, op: z.literal('min'), de: z.array(esquemaId).min(1) }),
])

export const esquemaNodo = z.discriminatedUnion('tipo', [
  esquemaInput,
  esquemaConstante,
  esquemaTipoCambio,
  esquemaCampoVehiculo,
  esquemaBandera,
  esquemaOpcion,
  esquemaTabla,
  esquemaTramo,
  esquemaCalculo,
])

export type Nodo = z.infer<typeof esquemaNodo>
export type TipoDeNodo = Nodo['tipo']
export type NodoCalculo = Extract<Nodo, { tipo: 'calculo' }>
export type NodoOpcion = Extract<Nodo, { tipo: 'opcion' }>

// Las operaciones que comparan: las de condición, `elegir` (toma una rama según su `prueba`) y `max`/`min` (el mayor y el menor de
// sus términos). Lo que recorre las operaciones va en dos pasos: éstas y las de cuenta (`NodoDeCuenta`).
export const OPS_DE_COMPARACION = [...OPS_DE_CONDICION, 'elegir', 'max', 'min'] as const
export type NodoDeComparacion = Extract<NodoCalculo, { op: (typeof OPS_DE_COMPARACION)[number] }>
export type NodoDeCuenta = Exclude<NodoCalculo, NodoDeComparacion>
export const esDeComparacion = (n: NodoCalculo): n is NodoDeComparacion =>
  (OPS_DE_COMPARACION as readonly string[]).includes(n.op)

// Si un nodo vale 1 o 0 y sirve de condición: una bandera o una operación de condición.
export const esCondicion = (n: Nodo): boolean =>
  n.tipo === 'bandera' ||
  (n.tipo === 'calculo' && (OPS_DE_CONDICION as readonly string[]).includes(n.op))

// `formato` es opcional y vale `usd`, como el `coalesce` de la base. El Zod no pone el default:
// lo que se guarda no cambia al validarlo.
export const formatoDe = (n: Pick<Nodo, 'formato'>): Formato => n.formato ?? 'usd'
export const esMonto = (n: Pick<Nodo, 'formato'>) =>
  formatoDe(n) === 'usd' || formatoDe(n) === 'moneda'

// Si el tipo de nodo da un monto, sea cual sea su formato: un tipo de cambio, un campo del vehículo, una
// bandera o la variante no lo dan, aunque digan `usd`. Sólo lo que da un monto puede ser miembro de un grupo.
export function daMonto(n: Nodo): boolean {
  switch (n.tipo) {
    case 'input':
    case 'constante':
    case 'tabla':
    case 'tramo':
    case 'calculo':
      return true
    case 'tipo_cambio':
    case 'campo_vehiculo':
    case 'bandera':
    case 'opcion':
      return false
    default: {
      const _: never = n
      return _
    }
  }
}
// Si el nodo acepta un valor de la persona (es una XCell): lo que se tipea (`input`), un default de la empresa o de la
// fórmula (`constante`, `tipo_cambio`) o un sugerido que se puede sobrescribir. Sólo estos llevan fuente.
export function aceptaValor(n: Nodo): boolean {
  switch (n.tipo) {
    case 'input':
    case 'constante':
    case 'tipo_cambio':
      return true
    case 'tabla':
    case 'tramo':
    case 'calculo':
      return n.sobrescribible === true
    case 'campo_vehiculo':
    case 'bandera':
    case 'opcion':
      return false
    default: {
      const _: never = n
      return _
    }
  }
}
// Un cálculo que se pisa al cotizar si la hoja lo dibuja en una celda (docs/COTIZADOR.md › «Pisar un cálculo»): un `tabla`,
// un `tramo` o un `calculo` que no es el total. `sobrescribible` ya no lo limita.
export const esPisable = (n: Nodo): boolean =>
  (n.tipo === 'tabla' || n.tipo === 'tramo' || n.tipo === 'calculo') && n.salida !== 'total'
// `ninguno` (o nada) = sin bucket.
export const bucketDe = (n: Pick<Nodo, 'bucket'>) =>
  n.bucket === undefined || n.bucket === 'ninguno' ? undefined : n.bucket
// Lo que un nodo condiciona a su variante (los tipos que lo admiten).
export const soloEnDe = (n: Nodo): readonly string[] | undefined =>
  n.tipo === 'tipo_cambio' || n.tipo === 'opcion' ? undefined : n.solo_en
export const sobrescribibleDe = (n: Nodo) =>
  (n.tipo === 'tabla' || n.tipo === 'tramo' || n.tipo === 'calculo') && n.sobrescribible === true
export const condicionDe = (n: Nodo): string | undefined =>
  n.tipo === 'input' ||
  n.tipo === 'constante' ||
  n.tipo === 'tabla' ||
  n.tipo === 'tramo' ||
  n.tipo === 'calculo'
    ? n.condicion
    : undefined
