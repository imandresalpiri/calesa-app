import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { TarjetasDelPerfil } from '@/modules/equipo/pantallas/perfil'
import { TurnosDelPerfil } from '@/modules/web/pantallas/perfil'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { EsqueletoDeUnaTarjeta } from '@/shared/ui/esqueletos'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import { AyudaSeccion } from './ayuda-seccion'
import { NotificacionesSeccion } from './notificaciones-seccion'
import { ocultoEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Mi perfil' }

// El perfil propio: cualquiera con sesión lo edita, no pide ningún permiso. Seis tarjetas con lo guardado a la vista (Tú, Preferencias, Turnos de la web,
// Tu ficha en la web, Notificaciones y Ayuda); lo que se edita se abre en un modal (`?panel=`).
export default async function PaginaPerfil() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const sesion = await requerirSesion()
  return (
    <div className="grid gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Mi perfil</h1>
      <TarjetasDeAjustes etiqueta="Mi perfil">
        <TarjetasDelPerfil
          usuarioId={sesion.usuarioId}
          nombre={sesion.nombre}
          email={sesion.email}
          avatarRuta={sesion.avatarRuta}
          avatarUrl={urlPublicaONull('avatares', sesion.avatarRuta)}
          actualizadoEn={sesion.perfilActualizadoEn}
          zonaElegida={sesion.preferencias.zonaHoraria}
        />
        <Suspense
          fallback={
            <>
              <EsqueletoDeUnaTarjeta />
              <EsqueletoDeUnaTarjeta />
            </>
          }
        >
          <TurnosDelPerfil
            permisos={sesion.permisos}
            miraOtroRol={sesion.perspectiva.rol !== null}
          />
        </Suspense>
        <Suspense fallback={<EsqueletoDeUnaTarjeta />}>
          <NotificacionesSeccion usuarioId={sesion.usuarioId} permisos={sesion.permisos} />
        </Suspense>
        <Suspense fallback={<EsqueletoDeUnaTarjeta />}>
          <AyudaSeccion />
        </Suspense>
      </TarjetasDeAjustes>
    </div>
  )
}
