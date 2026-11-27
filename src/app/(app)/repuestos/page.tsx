import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { MarcasDeVistoDeLaPagina } from '@/modules/equipo/pantallas/marcas-de-visto'
import {
  MAXIMO_DE_PAGINA_DE_REPUESTOS,
  CLAVE_DE_LEAD_DEL_PROYECTO,
  CLAVE_DE_VEHICULO,
  CLAVE_DE_VISTA_DE_LA_CADENA,
  CLAVE_DE_VISTA_DE_REPUESTOS,
  esVistaDeLaCadena,
  esVistaDeStock,
  esquemaDelListado,
  estadoDelListadoDe,
  leerCursorDeProyectos,
  leerProyectosDelListado,
  nuevoProyectoEnLaUrl,
  pedidoDelListado,
} from '@/modules/repuestos'
import { BotonNuevoProyecto, ListadoDeProyectos } from '@/modules/repuestos/pantallas/proyectos'
import { leerLeadParaEnlazar } from '@/modules/leads'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_POR_PAGINA, leerFiltros } from '@/shared/lib/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { VistaYOpciones } from '@/shared/ui/vista-y-opciones'
import { z } from 'zod'
import { ListadoDeLaCadena } from './listado-de-la-cadena'
import { ListadoDeStock } from './listado-de-stock'
import { NuevoProyecto, type LeadResueltoDeLaUrl, type VehiculoDeLaUrl } from './nuevo-proyecto'
import { BotonDeConfigurar } from './boton-de-configurar'
import { grupoDeVista } from './vistas-de-repuestos'
import { ocultoEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Repuestos' }

// Los proyectos de repuestos (`docs/UX.md` › «Repuestos»): una página por cursor `numero` con sus filtros en la URL; con `?vista=cadena`, la cadena de ítems por fase (8.13-3); con `?vista=stock`, lo que está en stock (8.10-3). Lo que se ve lo decide la base (`repuestos_proyectos_listar()`
// devuelve vacío sin `repuestos.ver`); acá sólo se arma el pedido y se dibuja. Cada fila trae las cuentas de sus ítems: no hay una lectura por proyecto.
export default function PaginaDeRepuestos({ searchParams }: PageProps<'/repuestos'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra de filtros. */}
      <h1 className="sr-only">Repuestos</h1>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </>
  )
}

type Parametros = Record<string, string | string[] | undefined>

// El `?vehiculo=` con que se abre «Nuevo proyecto»: sólo se lee con el formulario en la URL y con `repuestos.editar`; el título sale bajo la RLS de quien mira (nulo si no
// existe o no se ve).
async function vehiculoDeLaUrl(parametros: Parametros): Promise<VehiculoDeLaUrl | null> {
  const id = unParametro(parametros[CLAVE_DE_VEHICULO])
  if (!nuevoProyectoEnLaUrl(parametros) || !z.guid().safeParse(id).success) {
    return null
  }
  const vehiculo = datosO(await leerVehiculo(id ?? ''))
  return { id: id ?? '', titulo: vehiculo?.titulo ?? null }
}

// El `?lead=` del formulario (el que deja «Nuevo lead» al guardar, o un enlace): sólo con el formulario en la URL, `repuestos.editar` y `leads.ver`. Su nombre sale bajo la
// RLS de quien mira (nulo si no existe, está en la papelera o el limbo, o no se ve), nunca su teléfono.
async function leadDeLaUrl(
  parametros: Parametros,
  permisos: Permisos,
): Promise<LeadResueltoDeLaUrl | null> {
  const id = unParametro(parametros[CLAVE_DE_LEAD_DEL_PROYECTO])
  if (
    !nuevoProyectoEnLaUrl(parametros) ||
    !puede(permisos, 'repuestos.editar') ||
    !puede(permisos, 'leads.ver') ||
    !z.guid().safeParse(id).success
  ) {
    return null
  }
  const lead = datosO(await leerLeadParaEnlazar(id ?? ''))
  return { id: id ?? '', titulo: lead === null ? null : lead.nombre.trim() || 'Sin nombre' }
}

// Stock no tiene barra: «Vista y opciones» va solo, arriba a la izquierda, con el ⚙ al lado.
function VistaDeStock({
  parametros,
  permisos,
  configurar,
}: {
  parametros: Parametros
  permisos: Permisos
  configurar: ReactNode
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <VistaYOpciones grupos={[grupoDeVista('stock')]} />
        {configurar}
      </div>
      <ListadoDeStock parametros={parametros} puedeEditar={puede(permisos, 'repuestos.editar')} />
    </div>
  )
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/repuestos'>['searchParams']
}) {
  const oculto = await ocultoEnElLive('repuestos.estadisticas')
  if (oculto) {
    return oculto
  }
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  // El ⚙ «Configurar» (Repuestos › Configuración) va en la fila de filtros de las tres vistas, sólo con `repuestos.configurar`.
  const configurar = puede(sesion.permisos, 'repuestos.configurar') ? <BotonDeConfigurar /> : null
  // La vista «Cadena» (`?vista=cadena`, 8.13-3): los ítems por fase del flujo de repuestos; con `?item=` abre el panel del ítem.
  if (esVistaDeLaCadena(unParametro(parametros[CLAVE_DE_VISTA_DE_LA_CADENA]))) {
    return (
      <div className="grid gap-4">
        <ListadoDeLaCadena
          parametros={parametros}
          permisos={sesion.permisos}
          opciones={[grupoDeVista('cadena')]}
          acciones={configurar}
        />
      </div>
    )
  }
  // La vista «Stock» (`?vista=stock`, 8.10-3) no lee proyectos ni ofrece «Nuevo proyecto».
  if (esVistaDeStock(unParametro(parametros[CLAVE_DE_VISTA_DE_REPUESTOS]))) {
    return (
      <VistaDeStock parametros={parametros} permisos={sesion.permisos} configurar={configurar} />
    )
  }
  const esquema = esquemaDelListado()
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia: sesion.preferencias.porPagina,
    maximo: MAXIMO_DE_PAGINA_DE_REPUESTOS,
  })
  const filtros = leerFiltros(esquema, parametros)
  const pedido = pedidoDelListado(filtros, {
    cursor: leerCursorDeProyectos(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano,
  })
  const puedeEditar = puede(sesion.permisos, 'repuestos.editar')
  const [pagina, delVehiculo, delLead] = await Promise.all([
    leerProyectosDelListado(pedido).then(datosO),
    puedeEditar ? vehiculoDeLaUrl(parametros) : Promise.resolve(null),
    leadDeLaUrl(parametros, sesion.permisos),
  ])
  const estado = estadoDelListadoDe(filtros)
  return (
    <div className="grid gap-4">
      {/* La fila abre `/repuestos/<id>`, que lo registra visto: acá no hay resumen abierto, sin `parametro`. */}
      <MarcasDeVistoDeLaPagina
        modulo="repuestos"
        consultas={[{ tipo: 'proyecto_repuestos', ids: pagina.filas.map((fila) => fila.id) }]}
      >
        <ListadoDeProyectos
          pagina={pagina}
          esquema={esquema}
          estado={estado}
          porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_REPUESTOS) }}
          acciones={configurar}
          nuevo={puedeEditar ? <BotonNuevoProyecto /> : null}
          opciones={[grupoDeVista('proyectos')]}
        />
      </MarcasDeVistoDeLaPagina>
      <NuevoProyecto
        puedeEditar={puedeEditar}
        puedeVerLeads={puede(sesion.permisos, 'leads.ver')}
        puedeCrearLeads={puede(sesion.permisos, 'leads.crear')}
        vehiculoDeLaUrl={delVehiculo}
        leadDeLaUrl={delLead}
      />
    </div>
  )
}
