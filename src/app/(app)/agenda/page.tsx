import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  extraDeEnlaces,
  gruposDePendientes,
  leerAgenda,
  leerClases,
  leerFecha,
  leerVista,
  puedeDarTareaAOtro,
  rangoDe,
} from '@/modules/agenda'
import { CalendarioDeAgenda, PanelesDeAgenda } from '@/modules/agenda/pantallas/agenda'
import { EsqueletoDePendientes } from '@/modules/agenda/pantallas/agenda-esqueletos'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { MarcasDeVistoDeLaPagina } from '@/modules/equipo/pantallas/marcas-de-visto'
import { datosO } from '@/shared/lib/errores'
import { diaEnZona, ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { NuevoDeLaAgenda } from './nuevo-de-la-agenda'
import { leerPedidosDeLaUrl } from './pedidos'
import { PendientesDeLaPagina } from './pendientes'
import { ocultoEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Agenda' }

// La agenda como libreta: la hoja del día (la vista de por defecto, en todo ancho), semana o mes, en la zona de la empresa, con los pendientes de quien mira al
// costado. Lo que se ve lo decide la base con la sesión de quien mira (`agenda_rango` y `agenda_pendientes`, de invocador); la vista, la fecha, las clases y «la de
// todos» viven en la URL. Los pendientes llegan tras su propio `<Suspense>`: el día no los espera.
export default async function PaginaDeAgenda({ searchParams }: PageProps<'/agenda'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  // La sesión y los ajustes se leen al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, ajustes, parametros] = await Promise.all([
    requerirSesion(),
    leerAjustes(),
    searchParams,
  ])
  const zona = ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO
  const hoy = diaEnZona(new Date().toISOString(), { zona })
  const vista = leerVista(unParametro(parametros['vista']), 'dia')
  const fecha = leerFecha(unParametro(parametros['fecha']), hoy)
  const clases = leerClases(unParametro(parametros['ver']))
  // `?de=todos` sin `agenda.ver_todo` se ignora (la base lo rechazaría): ver la de todos es un filtro de lectura, no una acción.
  const puedeVerTodo = puede(sesion.permisos, 'agenda.ver_todo')
  const deTodos = puedeVerTodo && unParametro(parametros['de']) === 'todos'
  const [lectura, pedidos] = await Promise.all([
    leerAgenda({ ...rangoDe(vista, fecha, zona), deTodos }),
    leerPedidosDeLaUrl(parametros, sesion.usuarioId, sesion.permisos),
  ])
  const agenda = datosO(lectura)
  // Los pendientes son siempre de quien mira; «Qué ver» decide qué grupos (sin tareas ni recordatorios, no hay columna).
  const grupos = gruposDePendientes(clases)
  const ahora = new Date().toISOString()
  return (
    <>
      {/* Los chips de eventos y tareas marcan lo visto (una lectura por pantalla); abrir `?evento=` o `?tarea=` lo registra. */}
      <MarcasDeVistoDeLaPagina
        modulo="agenda"
        consultas={[
          { tipo: 'evento', ids: agenda.eventos.map((e) => e.id), parametro: 'evento' },
          { tipo: 'tarea', ids: agenda.tareas.map((t) => t.id), parametro: 'tarea' },
        ]}
      >
        <CalendarioDeAgenda
          agenda={agenda}
          vista={vista}
          fecha={fecha}
          hoy={hoy}
          zona={zona}
          ahora={ahora}
          clases={clases}
          puedeVerTodo={puedeVerTodo}
          deTodos={deTodos}
          nuevo={<NuevoDeLaAgenda />}
          nuevoDelDiaVacio={<NuevoDeLaAgenda atajo={false} />}
          pendientes={
            grupos.length > 0 ? (
              <Suspense fallback={<EsqueletoDePendientes />}>
                <PendientesDeLaPagina
                  grupos={grupos}
                  hoy={hoy}
                  zona={zona}
                  base={{ vista, fecha, extra: extraDeEnlaces(clases, deTodos) }}
                  deTodos={deTodos}
                />
              </Suspense>
            ) : null
          }
        />
      </MarcasDeVistoDeLaPagina>
      <PanelesDeAgenda
        evento={pedidos.evento}
        tarea={pedidos.tarea}
        recordatorio={pedidos.recordatorio}
        ahora={ahora}
        puedePublicar={puede(sesion.permisos, 'agenda.eventos.publicar')}
        puedeVincularLead={puede(sesion.permisos, 'leads.ver')}
        puedeAsignar={puedeDarTareaAOtro(sesion.permisos)}
        zona={zona}
        hoy={hoy}
        fecha={fecha}
      />
    </>
  )
}
