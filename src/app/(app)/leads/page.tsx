import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerAjustes } from '@/modules/empresa'
import { leerVistas, puede, requerirSesion } from '@/modules/equipo'
import {
  CLAVE_DE_VISTA,
  VISTA_EMBUDO,
  leerListadoDeLeads,
  leerVistaDeEmbudo,
} from '@/modules/leads'
import {
  EsqueletoDeTablero,
  ListadoDeLeads,
  VistaDeEmbudo,
} from '@/modules/leads/pantallas/listado'
import { datosO } from '@/shared/lib/errores'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import type { ParametrosDeUrl } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { rutasDelMenuDeLaPagina } from './rutas-del-menu'
import { ocultoEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Leads' }

// Los leads que la persona puede ver. Quién ve qué lo decide la base (`leads_vista` y la RLS de
// `leads`): «propios» sólo lo de su cartera; «todos», todo, con el teléfono enmascarado y sin los
// datos «solo la cartera» de los ajenos. El modo, los filtros y la página vienen en la URL, y lo
// que no corresponde se ignora. Cada fila lleva a la ficha del lead.
export default async function PaginaLeads({ searchParams }: PageProps<'/leads'>) {
  const oculto = await ocultoEnElLive('clientes')
  if (oculto) {
    return oculto
  }
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'leads.ver')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver leads. Pídeselo a quien administra los roles." />
    )
  }
  // La vista de embudo: el kanban de las oportunidades propias. Los filtros de la lista no aplican.
  if (unParametro(parametros[CLAVE_DE_VISTA] ?? undefined) === VISTA_EMBUDO) {
    return (
      <Suspense fallback={<EsqueletoDeTablero />}>
        <Embudo
          parametros={parametros}
          quien={{ permisos: sesion.permisos, usuarioId: sesion.usuarioId }}
        />
      </Suspense>
    )
  }
  const [ajustesLeidos, vistas, rutas] = await Promise.all([
    leerAjustes(),
    leerVistas('leads'),
    rutasDelMenuDeLaPagina(sesion.permisos),
  ])
  // Si no se pueden leer, el listado se dibuja igual: zona por defecto y el teléfono con «+».
  const ajustes = ajustesLeidos.ok ? ajustesLeidos.data.ajustes : null
  const listado = datosO(
    await leerListadoDeLeads({
      permisos: sesion.permisos,
      parametros,
      zona: ajustes?.zonaHoraria ?? ZONA_POR_DEFECTO,
      usuarioId: sesion.usuarioId,
      preferenciaDePagina: sesion.preferencias.porPagina,
    }),
  )
  return (
    <ListadoDeLeads
      {...listado}
      vistas={datosO(vistas)}
      puedeCrear={puede(sesion.permisos, 'leads.crear')}
      puedeExportar={puede(sesion.permisos, 'leads.exportar')}
      puedeConfigurarCampos={puede(sesion.permisos, 'leads.campos.gestionar')}
      codigoDePais={ajustes?.telefonoCc ?? null}
      rutas={rutas}
    />
  )
}

async function Embudo({
  parametros,
  quien,
}: {
  parametros: ParametrosDeUrl
  quien: Parameters<typeof leerVistaDeEmbudo>[1]
}) {
  await connection()
  const [datos, rutas] = await Promise.all([
    leerVistaDeEmbudo(parametros, quien),
    rutasDelMenuDeLaPagina(quien.permisos),
  ])
  return <VistaDeEmbudo {...datosO(datos)} rutas={rutas} />
}
