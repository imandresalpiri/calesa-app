// Una fase del flujo tal como la configura su dueña: todos sus atributos y su posición en el diagrama. La fila se valida con Zod en el borde y sale en
// camelCase (`flujoParaConfigurarDesde`, en `flujo.ts`).
import { z } from 'zod'

const id = z.guid()
const textoONulo = z.string().nullable()
const numeroONulo = z.number().nullable()

export const esquemaDeFase = z.object({
  id,
  nombre: z.string(),
  descripcion: textoONulo,
  color: z.string(),
  icono: textoONulo,
  orden: z.number(),
  activa: z.boolean(),
  es_inicial: z.boolean(),
  es_final: z.boolean(),
  es_logistica: z.boolean(),
  demora_dias: numeroONulo,
  alerta_cada_horas: numeroONulo,
  nota_obligatoria: z.boolean(),
  permite_contenedor: z.boolean(),
  permite_aduana: z.boolean(),
  cuenta_llegada_repuestos: z.boolean(),
  publica_web: z.boolean(),
  visible_portal: z.boolean(),
  alias_portal: textoONulo,
  descripcion_portal: textoONulo,
  es_subasta: z.boolean(),
  // `numeric` llega como número; las dos nulas = sin posición (el acomodo automático).
  posicion_x: numeroONulo,
  posicion_y: numeroONulo,
})

// Dónde se dibuja la fase en el diagrama, en rem del lienzo (la esquina de arriba a la izquierda de su caja).
export type PosicionDeLaFase = { x: number; y: number }

export type FaseParaConfigurar = {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  icono: string | null
  orden: number
  activa: boolean
  esInicial: boolean
  esFinal: boolean
  esLogistica: boolean
  demoraDias: number | null
  alertaCadaHoras: number | null
  notaObligatoria: boolean
  permiteContenedor: boolean
  permiteAduana: boolean
  cuentaLlegadaRepuestos: boolean
  publicaWeb: boolean
  visiblePortal: boolean
  aliasPortal: string | null
  descripcionPortal: string | null
  esSubasta: boolean
  // La **posición de la fase** en el diagrama, o nula: sin posición guardada.
  posicion: PosicionDeLaFase | null
}

export const faseParaConfigurarDesde = (f: z.infer<typeof esquemaDeFase>): FaseParaConfigurar => ({
  id: f.id,
  nombre: f.nombre,
  descripcion: f.descripcion,
  color: f.color,
  icono: f.icono,
  orden: f.orden,
  activa: f.activa,
  esInicial: f.es_inicial,
  esFinal: f.es_final,
  esLogistica: f.es_logistica,
  demoraDias: f.demora_dias,
  alertaCadaHoras: f.alerta_cada_horas,
  notaObligatoria: f.nota_obligatoria,
  permiteContenedor: f.permite_contenedor,
  permiteAduana: f.permite_aduana,
  cuentaLlegadaRepuestos: f.cuenta_llegada_repuestos,
  publicaWeb: f.publica_web,
  visiblePortal: f.visible_portal,
  aliasPortal: f.alias_portal,
  descripcionPortal: f.descripcion_portal,
  esSubasta: f.es_subasta,
  posicion:
    f.posicion_x === null || f.posicion_y === null ? null : { x: f.posicion_x, y: f.posicion_y },
})
