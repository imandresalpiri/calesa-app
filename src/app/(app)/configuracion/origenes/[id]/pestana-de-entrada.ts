import { rutaDeParteDelOrigen, type ParteDelOrigen } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../../con-parametros'

type Entrada = {
  id: string
  parametros: ParametrosDeLaUrl
  // La última pestaña que la persona abrió en este origen (`origenes.ultima_pestana`), si la hay.
  recordada: ParteDelOrigen | null
  // Las pestañas que la persona abre en este origen, en su orden.
  abiertas: readonly ParteDelOrigen[]
}

// A dónde lleva `/configuracion/origenes/<id>` sin pestaña: a la última que la persona abrió ahí si todavía la abre; si no, a la primera que abre; si no
// abre ninguna, a Fases (la pestaña dice por qué no se abre). Conserva la consulta entera. Nunca vuelve a `/<id>` sin pestaña.
export function destinoAlEntrar({ id, parametros, recordada, abiertas }: Entrada): string {
  const pestana =
    recordada !== null && abiertas.includes(recordada) ? recordada : (abiertas[0] ?? 'fases')
  return conParametros(rutaDeParteDelOrigen(id, pestana), parametros)
}
