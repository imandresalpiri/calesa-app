import { requerirSesion } from '@/modules/equipo'
import { conBotonDeConfigurar, enlacesDeLogistica } from './enlaces'
import { BotonDeConfigurar, SubNavegacion } from './sub-navegacion'

// Lee la sesión, así que va tras un `<Suspense>`. Con un solo enlace (Cadena) no hay nada que elegir: no dibuja la barra. El botón «Configurar» va a la derecha de la misma fila, con la barra o
// solo (sólo con `logistica.catalogos.gestionar`).
export async function MenuDeLogistica() {
  const sesion = await requerirSesion()
  const enlaces = enlacesDeLogistica(sesion.permisos)
  const conBoton = conBotonDeConfigurar(sesion.permisos)
  if (enlaces.length <= 1 && !conBoton) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      {enlaces.length > 1 ? <SubNavegacion enlaces={enlaces} /> : <span />}
      {conBoton ? <BotonDeConfigurar /> : null}
    </div>
  )
}
