import 'server-only'
import { requerirSesion } from '@/modules/equipo'
import { pestanaDeLaConfiguracion, puedeAbrirLaPestana } from './pestanas'

// Lo que cada pestaña de Logística › Configuración comprueba antes de dibujarse (un layout no protege a su página): con alguno de los permisos de su pestaña, la sesión; sin
// ninguno (o una pestaña que nadie registró), `sinPermiso` y la página dice «No tienes permiso». La base vuelve a exigir lo suyo en cada RPC y policy.
export async function abrirLaPestana(clave: string) {
  const sesion = await requerirSesion()
  const pestana = pestanaDeLaConfiguracion(clave)
  if (pestana === null || !puedeAbrirLaPestana(pestana, sesion.permisos)) {
    return { sinPermiso: true as const }
  }
  return { sinPermiso: false as const, sesion }
}
