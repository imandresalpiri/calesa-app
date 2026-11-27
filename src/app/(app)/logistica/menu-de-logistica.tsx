import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { enlacesDeLogistica, origenesParaConfigurar } from './enlaces'
import { BotonDeConfigurar, SubNavegacion } from './sub-navegacion'

// Lee la sesión y los orígenes, así que va tras un `<Suspense>`. Con un solo enlace (Cadena) no hay nada que elegir: no dibuja la barra. El botón
// «Configurar» va a la derecha de la misma fila, con la barra o solo: lleva a la pestaña Fases de un origen que la persona configura (`flujos.configurar` o
// los catálogos de logística ahí); sin ninguno, o sin poder leer los orígenes, no está.
export async function MenuDeLogistica() {
  const sesion = await requerirSesion()
  const enlaces = enlacesDeLogistica(sesion.permisos)
  const origenes = await getOrigenes(true)
  // Si la lista no se pudo leer, la barra queda sin el botón: nunca tumba la cadena.
  const permitidos = origenes.ok ? origenesParaConfigurar(sesion.permisos, origenes.data) : []
  if (enlaces.length <= 1 && permitidos.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      {enlaces.length > 1 ? <SubNavegacion enlaces={enlaces} /> : <span />}
      {permitidos.length > 0 ? <BotonDeConfigurar permitidos={permitidos} /> : null}
    </div>
  )
}
