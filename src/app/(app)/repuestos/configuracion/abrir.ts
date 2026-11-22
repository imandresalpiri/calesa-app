import 'server-only'
import { puede, requerirSesion } from '@/modules/equipo'

// Lo que cada pestaña de Repuestos › Configuración comprueba antes de dibujarse (un layout no protege a su página): con `repuestos.configurar` (en algún origen: lo configurado es de
// la empresa), la sesión; sin ella, `sinPermiso` y la página dice «No tienes permiso». La base vuelve a exigirla en cada RPC y policy.
export async function abrirLaPestana() {
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'repuestos.configurar')) {
    return { sinPermiso: true as const }
  }
  return { sinPermiso: false as const, sesion }
}
