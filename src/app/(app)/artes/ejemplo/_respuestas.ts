// Las respuestas de las rutas del vehículo de ejemplo del editor de artes (`GET /artes/ejemplo/*`): JSON o texto, nunca guardadas (lo que llega
// depende de quien pide y de su Modo Live). Lo que no existe, está en la papelera, es de otro origen o no se ve es el mismo 404, nunca 403.
import { SIN_MEDIO } from '@/modules/artes'

export const NO_ESTA_EL_VEHICULO = 'Este vehículo no existe o ya no tienes acceso.'
export const NO_ESTA_LA_COTIZACION =
  'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
export const NO_SE_PUDO = 'No se pudieron leer los datos de ejemplo. Vuelve a intentarlo.'

export const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_MEDIO },
  })

export const json = (cuerpo: unknown) => Response.json(cuerpo, { headers: SIN_MEDIO })
