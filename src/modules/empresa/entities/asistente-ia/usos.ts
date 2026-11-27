// Los usos del asistente de IA de este mes, por persona, como los dice la tarjeta: hasta 5 filas y «y N más». Nunca un total exacto: la base
// cuenta con tope (`asistente_ia_usos_del_mes()`: hasta 6 personas y `limit 101`).
import { z } from 'zod'
import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

export const TOPE_DE_USOS_A_LA_VISTA = 5
// Espejo del `limit 101` de la base: más de 100 personas con usos se dice «más de».
const TOPE_DE_PERSONAS_CONTADAS = 100

export type UsoDelMes = { usuarioId: string; nombre: string; usos: number }

export type UsosDelMes = {
  // El primer día del mes, en la zona de la empresa (YYYY-MM-DD).
  mes: string
  personas: UsoDelMes[]
  // Cuántas personas más usaron el asistente, o null si no hay más.
  resto: ConteoAcotado | null
}

const esquemaDeLosUsos = z.object({
  mes: z.string(),
  personas: z.array(z.object({ usuario_id: z.guid(), nombre: z.string(), usos: z.int().min(1) })),
  cuantas: z.int().min(0),
})

export function usosDelMes(leido: unknown): Resultado<UsosDelMes> {
  const usos = esquemaDeLosUsos.safeParse(leido)
  if (!usos.success) return fallo('inesperado', 'No se pudieron leer los usos.')
  const { mes, personas, cuantas } = usos.data
  const resto =
    cuantas > TOPE_DE_PERSONAS_CONTADAS
      ? { n: TOPE_DE_PERSONAS_CONTADAS - TOPE_DE_USOS_A_LA_VISTA, hayMas: true }
      : cuantas > TOPE_DE_USOS_A_LA_VISTA
        ? { n: cuantas - TOPE_DE_USOS_A_LA_VISTA, hayMas: false }
        : null
  return ok({
    mes,
    personas: personas
      .slice(0, TOPE_DE_USOS_A_LA_VISTA)
      .map((p) => ({ usuarioId: p.usuario_id, nombre: p.nombre, usos: p.usos })),
    resto,
  })
}

// «y 3 más» o, pasado el tope, «y 95+ más».
export function textoDelResto(resto: ConteoAcotado, locale: string): string {
  return `y ${conteoCorto(resto, { locale })} más`
}
