// Un origen de vehículos. El nombre, el sustantivo y el género salen de la fila: ningún texto fijo
// de la interfaz nombra un origen (docs/UX.md).
import { z } from 'zod'
import { datosClaveDesde, type DatoClave } from './datos-clave'

export const TIPOS_DE_ORIGEN = ['subasta', 'manual'] as const
export type TipoDeOrigen = (typeof TIPOS_DE_ORIGEN)[number]

export const GENEROS = ['m', 'f'] as const
export type Genero = (typeof GENEROS)[number]

export const ETIQUETA_DE_TIPO_DE_ORIGEN: Record<TipoDeOrigen, string> = {
  subasta: 'Subasta',
  manual: 'Manual',
}

// Lo mínimo para nombrar y elegir un origen desde otra pantalla: la matriz de roles acota permisos
// por origen, y el inventario tiene una pestaña por cada uno. `activo` deja marcar uno desactivado
// sin esconder lo suyo; el sustantivo y el género son para escribir «Nueva unidad» sin texto fijo,
// y el tipo decide qué datos comunes lleva lo que entra (lote y plataforma sólo en subasta).
export type OrigenResumen = {
  id: string
  nombre: string
  color: string
  activo: boolean
  sustantivo: string
  genero: Genero
  tipo: TipoDeOrigen
}

// Las columnas que pide `origenesDesde()`.
export const COLUMNAS_DE_RESUMEN = 'id, nombre, color, activo, sustantivo, genero, tipo'

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
const esquemaResumen = z.array(
  z.object({
    id: z.guid(),
    nombre: z.string(),
    color: z.string(),
    activo: z.boolean(),
    sustantivo: z.string(),
    genero: z.enum(GENEROS),
    tipo: z.enum(TIPOS_DE_ORIGEN),
  }),
)

export function origenesDesde(filas: unknown): OrigenResumen[] {
  return esquemaResumen.parse(filas)
}

export type Origen = OrigenResumen & {
  // Estable: lo nombran las fórmulas y las fichas. Sale del nombre al crear y no cambia.
  clave: string
  apibaraPlataformas: string[]
  // Los hasta 4 datos que la ficha de sus vehículos muestra primero, en orden (vacía = los de fábrica de su tipo).
  datosClave: DatoClave[]
  // La versión de la fila: toda edición la manda.
  actualizadoEn: string
}

// Lo que ata a un origen, contado por la base (incluida la papelera).
export type UsoDeOrigen = {
  vehiculos: number
  cotizaciones: number
  camposActivos: number
  categorias: number
  fases: number
  // Si tiene fórmula activa (la que se cotiza: una activa siempre tiene versión publicada).
  formulaPublicada: boolean
  concesiones: number
  // La tarjeta de la cotización publicada en la fórmula activa (sin ella se usa la de siempre). La cuenta la base: la RLS de las
  // plantillas la esconde a quien no configura el cotizador.
  tarjetaPublicada: boolean
}

export type OrigenConUso = Origen & { uso: UsoDeOrigen }

const esquemaOrigen = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  sustantivo: z.string(),
  genero: z.enum(GENEROS),
  tipo: z.enum(TIPOS_DE_ORIGEN),
  color: z.string(),
  activo: z.boolean(),
  apibara_plataformas: z.array(z.string()),
  datos_clave: z.unknown(),
  actualizado_en: z.string(),
})

const esquemaUso = z.object({
  origen_id: z.guid(),
  vehiculos: z.number(),
  cotizaciones: z.number(),
  campos_activos: z.number(),
  categorias: z.number(),
  fases: z.number(),
  formula_publicada: z.boolean(),
  concesiones: z.number(),
  tarjeta_publicada: z.boolean(),
})

const USO_VACIO: UsoDeOrigen = {
  vehiculos: 0,
  cotizaciones: 0,
  camposActivos: 0,
  categorias: 0,
  fases: 0,
  formulaPublicada: false,
  concesiones: 0,
  tarjetaPublicada: false,
}

// Las filas de `origenes` unidas a su uso (`origenes_resumen()`), en el orden en que llegaron las
// primeras. Un origen sin fila de uso (quien lee no tiene el permiso) se muestra con todo en cero.
export function origenesConUsoDesde(filas: unknown, usos: unknown): OrigenConUso[] {
  const porOrigen = new Map(
    z
      .array(esquemaUso)
      .parse(usos)
      .map((uso) => [
        uso.origen_id,
        {
          vehiculos: uso.vehiculos,
          cotizaciones: uso.cotizaciones,
          camposActivos: uso.campos_activos,
          categorias: uso.categorias,
          fases: uso.fases,
          formulaPublicada: uso.formula_publicada,
          concesiones: uso.concesiones,
          tarjetaPublicada: uso.tarjeta_publicada,
        } satisfies UsoDeOrigen,
      ]),
  )
  return z
    .array(esquemaOrigen)
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      clave: fila.clave,
      nombre: fila.nombre,
      sustantivo: fila.sustantivo,
      genero: fila.genero,
      tipo: fila.tipo,
      color: fila.color,
      activo: fila.activo,
      apibaraPlataformas: fila.apibara_plataformas,
      datosClave: datosClaveDesde(fila.datos_clave),
      actualizadoEn: fila.actualizado_en,
      uso: porOrigen.get(fila.id) ?? USO_VACIO,
    }))
}

// La confirmación de eliminar un origen, en la URL de su página (`?panel=eliminar-origen`).
export const PANEL_ELIMINAR_ORIGEN = 'eliminar-origen'

// «Datos» de la página de un origen, en un drawer (`?panel=datos`): tipo, nombre, sustantivo y género, color y plataformas de subasta.
export const PANEL_DATOS_DEL_ORIGEN = 'datos'

// Por qué un origen no se elimina, o null si se puede. Es la misma regla que aplica
// `origen_eliminar()`: la interfaz la dice antes, la base la vuelve a comprobar.
export function motivoParaNoEliminar(origen: OrigenConUso): string | null {
  const { vehiculos, cotizaciones, formulaPublicada } = origen.uso
  const atado: string[] = []
  if (vehiculos > 0) {
    atado.push(`${vehiculos} ${vehiculos === 1 ? 'vehículo' : 'vehículos'}`)
  }
  if (cotizaciones > 0) {
    atado.push(`${cotizaciones} ${cotizaciones === 1 ? 'cotización' : 'cotizaciones'}`)
  }
  if (formulaPublicada) {
    atado.push('una fórmula publicada')
  }
  if (atado.length === 0) {
    return null
  }
  return `«${origen.nombre}» tiene ${atado.join(', ')}. Desactívalo en vez de eliminarlo.`
}

// Lo que el formulario de datos muestra: cuando cambia, el formulario arranca de lo guardado. La
// versión no entra (otra parte de la fila, como activar o desactivar o marcar un dato clave, la mueve sin tocar esto).
export function huellaDelOrigen(origen: Origen): string {
  return JSON.stringify([
    origen.nombre,
    origen.sustantivo,
    origen.genero,
    origen.color,
    origen.apibaraPlataformas,
  ])
}
