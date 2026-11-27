import type { Metadata } from 'next'
import { connection } from 'next/server'
import { leerAjustes } from '@/modules/empresa'
import { nombreVisible, requerirSesion, sinRol } from '@/modules/equipo'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { puede } from '@/shared/lib/permisos'
import { Bandeja, bloqueVisible } from '@/modules/tablero/pantallas/inicio'
import { InicioEnElLive } from './_inicio/inicio-en-el-live'
import { PanelDeTurnos } from './_inicio/panel-de-turnos'
import { VincularTurno } from './_inicio/vincular-turno'
import { ocultoEnElLive } from './_live/guarda'

export const metadata: Metadata = { title: 'Inicio' }

// Inicio = la bandeja de trabajo, armada con los permisos de quien entra. Con el Modo Live (y Inicio a la vista), no se lee: `InicioEnElLive`.
export default async function PaginaInicio() {
  const oculto = await ocultoEnElLive('inicio')
  if (oculto) {
    return oculto
  }
  // La sesión y los ajustes se leen al pedir la pantalla, no al prepararla.
  await connection()
  const sesion = await requerirSesion()
  if (sesion.live.encendido) {
    return <InicioEnElLive live={sesion.live} permisos={sesion.permisos} />
  }
  const ajustes = await leerAjustes()
  const bloqueDeTurnos = bloqueVisible(sesion.permisos, 'turnos-web')
  return (
    <>
      <Bandeja
        nombre={nombreVisible(sesion).split(' ')[0] ?? ''}
        permisos={sesion.permisos}
        sinRol={sinRol(sesion)}
        // Si no se pueden leer los ajustes: la zona por defecto (como el exportador de leads).
        zona={ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO}
      />
      {/* «Ver todos» del bloque de turnos: todos mis turnos sin confirmar, de a 20 (`?panel=turnos`). */}
      {bloqueDeTurnos ? (
        <PanelDeTurnos
          titulo={bloqueDeTurnos.titulo}
          vacio={bloqueDeTurnos.vacio}
          puedeVincular={puede(sesion.permisos, 'leads.ver')}
        />
      ) : null}
      {/* «Vincular a lead» de un turno de la web (8.05-1): el panel de `leads` con la action de `web`, que sólo `src/app` junta. */}
      <VincularTurno
        puedeCrear={puede(sesion.permisos, 'leads.crear')}
        numeroGlobal={puede(sesion.permisos, 'leads.numero_global.ver')}
      />
    </>
  )
}
