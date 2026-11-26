// Las revisiones de una cotización guardada (4.15-3b): lo que dejó cada guardado, de la más nueva a la más vieja, con quién lo hizo. La base (`cotizacion_revisiones`) ya
// recorta cada diff a lo que quien mira ve; acá sólo se lee con Zod. Todo lo que se busca por el id de un nodo es un `Map`: un id como «constructor» es legal.
import { z } from 'zod'
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'
import { FORMATOS, MAXIMO_DE_DECIMALES, type Formato } from './nodos'

export type EtiquetasDeRevisiones = {
  nodos: ReadonlyMap<string, string>
  grupos: ReadonlyMap<string, string>
  // El formato de los cálculos (tabla, tramo o calculo) que nombra la página: la revisión dice cuál se pisó y de cuánto a cuánto.
  calculos: ReadonlyMap<string, Formato>
  // Los «Decimales» (glosario) de esos cálculos, sólo de los que los traen: lo pisado se dice con ellos.
  decimales: ReadonlyMap<string, number>
}

// Cómo se nombra un lado de un cambio de vehículo (T315): sin vehículo, uno que quien mira no ve (no existe, está en la papelera o no es de su alcance) o su título.
export type NombreDeVehiculo = 'sin' | 'oculto' | { titulo: string }

// Los dos lados de `diff.vehiculo_id`, ya nombrados al leer: nunca se copia un título a la revisión.
export type CambioDeVehiculo = { de: NombreDeVehiculo; a: NombreDeVehiculo }

export type RevisionDeLaCotizacion = {
  // El id de la revisión (un `bigint` de la base): es también el cursor de la página siguiente.
  id: number
  usuarioId: string | null
  creadoEn: string
  // El nombre del autor; nulo si no lo cargó o si no hay autor (`usuarioId` nulo).
  autor: string | null
  // El diff por columna (`{ de, a }`), ya recortado por la base: su forma la lee `cambiosDeLaRevision()`.
  diff: Readonly<Record<string, unknown>>
  // El cambio de vehículo con los dos nombrados (`conVehiculos()`); nulo si no cambió el vehículo o si no se pudieron leer los nombres (se dice sin ellos).
  vehiculo: CambioDeVehiculo | null
}

export type PaginaDeRevisiones = {
  revisiones: RevisionDeLaCotizacion[]
  // El cursor de la página siguiente (el id de la última de ésta); nulo si no hay más.
  siguiente: number | null
  etiquetas: EtiquetasDeRevisiones
}

const esquema = z.object({
  revisiones: z.array(
    z.object({
      id: z.number(),
      usuario_id: z.guid().nullable(),
      creado_en: z.string().min(1),
      autor: z.object({ id: z.guid(), nombre: z.string().nullable() }).nullable(),
      diff: z.record(z.string(), z.unknown()),
    }),
  ),
  hay_mas: z.boolean(),
  siguiente: z.number().nullable(),
  etiquetas: z.object({
    nodos: z.record(z.string(), z.string()),
    grupos: z.record(z.string(), z.string()),
    calculos: z.record(z.string(), z.enum(FORMATOS)).optional(),
    decimales: z.record(z.string(), z.int().min(0).max(MAXIMO_DE_DECIMALES)).optional(),
  }),
})

// La respuesta de la base en la forma que usa el panel, o nulo si no es lo que promete: una fila suelta no sirve, porque el cursor no sabría por dónde seguir.
export function revisionesDesde(crudo: unknown): PaginaDeRevisiones | null {
  const leida = esquema.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const r = leida.data
  return {
    revisiones: r.revisiones.map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuario_id,
      creadoEn: fila.creado_en,
      autor: fila.autor?.nombre ?? null,
      diff: fila.diff,
      vehiculo: null,
    })),
    siguiente: r.hay_mas ? r.siguiente : null,
    etiquetas: {
      nodos: new Map(Object.entries(r.etiquetas.nodos)),
      grupos: new Map(Object.entries(r.etiquetas.grupos)),
      calculos: new Map(Object.entries(r.etiquetas.calculos ?? {})),
      decimales: new Map(Object.entries(r.etiquetas.decimales ?? {})),
    },
  }
}

const esId = z.guid()

// Los dos lados de `diff.vehiculo_id` de una revisión: un id, o nulo si ese lado no tenía vehículo (o la forma no es la que se espera).
function ladosDelVehiculo(
  diff: RevisionDeLaCotizacion['diff'],
): { de: unknown; a: unknown } | null {
  const cambio = diff['vehiculo_id']
  if (typeof cambio !== 'object' || cambio === null || Array.isArray(cambio)) {
    return null
  }
  const lados = cambio as Record<string, unknown>
  return { de: lados['de'] ?? null, a: lados['a'] ?? null }
}

// Los ids de vehículo que nombran los cambios de vehículo de una página, sin repetir y en minúsculas: a lo sumo dos por revisión (≤ 2 × `TAMANO_DE_VER_MAS`).
export function idsDeVehiculosDe(revisiones: readonly RevisionDeLaCotizacion[]): string[] {
  const ids = new Set<string>()
  for (const revision of revisiones) {
    const lados = ladosDelVehiculo(revision.diff)
    for (const lado of lados === null ? [] : [lados.de, lados.a]) {
      if (esId.safeParse(lado).success) {
        ids.add((lado as string).toLowerCase())
      }
    }
  }
  return [...ids]
}

function nombreDe(lado: unknown, titulos: ReadonlyMap<string, string>): NombreDeVehiculo {
  if (lado === null) {
    return 'sin'
  }
  const titulo = typeof lado === 'string' ? titulos.get(lado.toLowerCase()) : undefined
  return titulo === undefined ? 'oculto' : { titulo }
}

// La página con cada cambio de vehículo nombrado por los títulos que quien mira ve (por id, en minúsculas); un id que no está en `titulos` es «un vehículo que no puedes
// ver». Con `titulos` nulo (la lectura de los nombres falló), sin nombres: la revisión dice «Cambió el vehículo».
export function conVehiculos(
  pagina: PaginaDeRevisiones,
  titulos: ReadonlyMap<string, string> | null,
): PaginaDeRevisiones {
  if (titulos === null) {
    return pagina
  }
  return {
    ...pagina,
    revisiones: pagina.revisiones.map((revision) => {
      const lados = ladosDelVehiculo(revision.diff)
      return lados === null
        ? revision
        : {
            ...revision,
            vehiculo: { de: nombreDe(lados.de, titulos), a: nombreDe(lados.a, titulos) },
          }
    }),
  }
}

// Cómo se nombra a quien guardó: sin usuario (un guardado del sistema), «Sin autor»; con usuario y sin nombre cargado, «Sin nombre».
export function autorDeLaRevision(revision: RevisionDeLaCotizacion): string {
  if (revision.usuarioId === null) {
    return 'Sin autor'
  }
  return revision.autor ?? 'Sin nombre'
}

// El borde de «Ir a una fecha»: todo lo de ese día (en la zona de la empresa) y lo anterior, como el instante EXCLUSIVO `p_hasta` de `cotizacion_revisiones()` = el inicio del día
// siguiente. Nulo si `dia` no es un `YYYY-MM-DD` que exista. Las tres líneas son las de `cursorDeUnaFecha()` (leads) a propósito: subirlas a `shared/lib` sería otro paso.
export function hastaDeUnDia(dia: string, zona: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))) {
    return null
  }
  return inicioDelDia(diaSiguiente(dia), { zona })
}
