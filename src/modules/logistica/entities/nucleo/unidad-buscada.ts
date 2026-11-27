import { z } from 'zod'
import type { MinimoDeBusqueda } from '@/shared/lib/filtros'

// Una unidad que devolvió `logistica_donde_esta()` al buscar vehículos para sumar a una declaración o a un embarque o contenedor: lo que el buscador
// muestra y lo que el lote necesita (dónde va hoy y la versión de su transporte, para avisar antes de moverla y mandar la versión que se leyó). Está en el
// núcleo porque la usan aduana y transporte (un área no importa otra).
export type UnidadBuscada = {
  id: string
  titulo: string
  vin: string | null
  lote: string | null
  fase: string | null
  contenedorId: string | null
  contenedor: string | null
  embarqueId: string | null
  booking: string | null
  // La versión de su fila de transporte; nula si todavía no tiene.
  transporteActualizadoEn: string | null
}

export type UnidadesBuscadas = { unidades: UnidadBuscada[]; hayMas: boolean }

// Espejo de `logistica_donde_esta` (el mínimo de `q` de la cadena: 3 letras o dígitos seguidos): con menos, la base no busca y la interfaz ni la llama.
export const MINIMO_DE_BUSQUEDA_DE_UNIDADES: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

const esquema = z.object({
  unidades: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      vin: z.string().nullable(),
      lote: z.string().nullable(),
      fase_nombre: z.string().nullable(),
      contenedor_id: z.guid().nullable(),
      contenedor: z.string().nullable(),
      embarque_id: z.guid().nullable(),
      booking: z.string().nullable(),
      transporte_actualizado_en: z.string().nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

/** Lo que devolvió `logistica_donde_esta()`; nulo si no tiene la forma esperada. */
export function unidadesBuscadasDesde(datos: unknown): UnidadesBuscadas | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    hayMas: leido.data.hay_mas,
    unidades: leido.data.unidades.map((u) => ({
      id: u.id,
      titulo: u.titulo,
      vin: u.vin,
      lote: u.lote,
      fase: u.fase_nombre,
      contenedorId: u.contenedor_id,
      contenedor: u.contenedor,
      embarqueId: u.embarque_id,
      booking: u.booking,
      transporteActualizadoEn: u.transporte_actualizado_en,
    })),
  }
}
