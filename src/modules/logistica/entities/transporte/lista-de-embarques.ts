import { z } from 'zod'
import {
  camposDelEmbarque,
  datosDelEmbarque,
  esquemaDeConteo,
  type Conteo,
  type DatosDelEmbarqueLeido,
} from './embarque'
import { ESTADOS_DEL_CONTENEDOR, type EstadoDelContenedor } from './estado'

// Una página de `embarques_listar` y de `contenedores_listar`: la entidad con su estado y lo que lleva (los vehículos que quien mira ve), por cursor opaco (el id de la última fila).
// `cortada`: la base miró 500 sin llenar la página (un filtro de estado que casi nadie cumple): se ofrece «Seguir buscando» desde `siguiente`.

export type EmbarqueDeLaLista = DatosDelEmbarqueLeido & {
  contenedores: Conteo
  vehiculos: Conteo
  hayOcultos: boolean
  faltan: Conteo
}

export type ContenedorDeLaLista = {
  id: string
  numero: string
  tipo: string | null
  tipoNombre: string | null
  sello: string | null
  actualizadoEn: string
  estado: EstadoDelContenedor
  embarque: { id: string; booking: string } | null
  // La ETA de su embarque.
  etaEl: string | null
  vehiculos: Conteo
  hayOcultos: boolean
  faltan: Conteo
}

export type PaginaDe<Fila> = { filas: Fila[]; siguiente: string | null; cortada: boolean }
export type PaginaDeEmbarques = PaginaDe<EmbarqueDeLaLista>
export type PaginaDeContenedores = PaginaDe<ContenedorDeLaLista>

const loQueLleva = {
  vehiculos: esquemaDeConteo,
  hay_ocultos: z.boolean(),
  faltan: esquemaDeConteo,
}

const esquemaDeEmbarques = z.object({
  embarques: z.array(
    z.object({ ...camposDelEmbarque, contenedores: esquemaDeConteo, ...loQueLleva }),
  ),
  siguiente: z.guid().nullable(),
  cortada: z.boolean(),
})

/** Lo que devolvió `embarques_listar()`; nulo si no tiene la forma esperada. */
export function paginaDeEmbarquesDesde(datos: unknown): PaginaDeEmbarques | null {
  const r = esquemaDeEmbarques.safeParse(datos)
  if (!r.success) return null
  return {
    filas: r.data.embarques.map((e) => ({
      ...datosDelEmbarque(e),
      contenedores: e.contenedores,
      vehiculos: e.vehiculos,
      hayOcultos: e.hay_ocultos,
      faltan: e.faltan,
    })),
    siguiente: r.data.siguiente,
    cortada: r.data.cortada,
  }
}

const esquemaDeContenedores = z.object({
  contenedores: z.array(
    z.object({
      id: z.guid(),
      numero: z.string(),
      tipo: z.string().nullable(),
      tipo_nombre: z.string().nullable(),
      sello: z.string().nullable(),
      actualizado_en: z.string(),
      estado: z.enum(ESTADOS_DEL_CONTENEDOR),
      embarque: z.object({ id: z.guid(), booking: z.string() }).nullable(),
      eta_el: z.string().nullable(),
      ...loQueLleva,
    }),
  ),
  siguiente: z.guid().nullable(),
  cortada: z.boolean(),
})

/** Lo que devolvió `contenedores_listar()`; nulo si no tiene la forma esperada. */
export function paginaDeContenedoresDesde(datos: unknown): PaginaDeContenedores | null {
  const r = esquemaDeContenedores.safeParse(datos)
  if (!r.success) return null
  return {
    filas: r.data.contenedores.map((c) => ({
      id: c.id,
      numero: c.numero,
      tipo: c.tipo,
      tipoNombre: c.tipo_nombre,
      sello: c.sello,
      actualizadoEn: c.actualizado_en,
      estado: c.estado,
      embarque: c.embarque,
      etaEl: c.eta_el,
      vehiculos: c.vehiculos,
      hayOcultos: c.hay_ocultos,
      faltan: c.faltan,
    })),
    siguiente: r.data.siguiente,
    cortada: r.data.cortada,
  }
}
