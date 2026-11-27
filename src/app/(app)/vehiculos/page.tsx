import type { Metadata } from 'next'
import { rutaDeActividadDe } from '@/modules/actividad'
import { getAjustes, getPoliticaDeLimpieza, integracionActiva } from '@/modules/empresa'
import { leerVistas, puede, requerirSesion } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import {
  MAXIMO_DE_PAGINA_DE_VEHICULOS,
  buscarVehiculos,
  condicionesDe,
  esSubastaElegida,
  FILTRO_SUBASTA,
  leerCursorDelCierre,
  MARCADOR_DE_VEHICULO,
  ordenElegido,
  entradaDeRefresco,
  editablesDe,
  eliminablesDe,
  alcanceDeAvisos,
  esquemaDeFiltros,
  fuenteDelInventario,
  hoyEnZona,
  leadsVisiblesDe,
  limiteDeAviso,
  origenElegido,
  origenesVisibles,
  permisoDeAlta,
  permisoDeVitrina,
  puedeAbrirLaPapelera,
  sinResolverDe,
  vitrinaDelOrigen,
  type Vehiculo,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_POR_PAGINA, leerFiltros } from '@/shared/lib/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { leerCursor, leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { aprobadasDeLaPagina } from './aprobadas'
import { DOCUMENTOS_DEL_AVISO } from './documentos-del-aviso'
import { ListadoConCompartir } from './listado-con-compartir'
import { vehiculoEnEdicion } from './edicion'
import { panelesDeLaUrl } from './paneles'
import { paraCotizarDe } from './para-cotizar'
import { SiSeVeEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Vehículos' }

// Lo que el «⋯» de cada fila suma a lo de la página: si edita en el origen (lo que no puede editar se ve apagado); «Ver actividad», con `actividad.ver`,
// como una plantilla con `MARCADOR_DE_VEHICULO` (cada fila pone su id; `vehiculos` no conoce `actividad`); y, en un origen de subasta con apibara
// encendida (`filas`), qué se puede consultar para «Actualizar los datos».
function delMenu(permisos: Permisos, origenId: string, filas: readonly Vehiculo[] | null) {
  return {
    editaEnElOrigen: puede(permisos, 'vehiculos.editar', origenId),
    paraActividad: puede(permisos, 'actividad.ver')
      ? rutaDeActividadDe('vehiculos', MARCADOR_DE_VEHICULO)
      : null,
    subasta:
      filas === null
        ? null
        : {
            consultables: filas.flatMap((fila) =>
              entradaDeRefresco(fila) === null ? [] : [fila.id],
            ),
            puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar'),
          },
  }
}

// Una vista de un origen que la persona ya no ve no se ofrece.
function vistasDeOrigenesVisibles<
  V extends { params: Readonly<Record<string, string | undefined>> },
>(vistas: readonly V[], visibles: readonly { id: string }[]): V[] {
  const ids = new Set(visibles.map((uno) => uno.id))
  return vistas.filter((vista) => ids.has(vista.params['origen'] ?? ''))
}

// Lo que se pregunta por una página ya leída, sólo por sus ids: quién ofrece «Editar» y a quién se puede elegir para la papelera; de los que se pueden enviar a la papelera y tienen lead,
// cuáles se pueden abrir (casi siempre ninguno, y entonces no se pregunta); y la cotización aprobada de cada vehículo (una consulta por clave primaria, sólo con `cotizaciones.ver`).
async function deLaPagina(
  sesion: Awaited<ReturnType<typeof requerirSesion>>,
  filas: Parameters<typeof editablesDe>[1],
) {
  const [editables, eliminables, aprobadas] = await Promise.all([
    editablesDe(sesion, filas),
    eliminablesDe(sesion, filas),
    aprobadasDeLaPagina(sesion.permisos, filas),
  ])
  const leadsVisibles = await leadsVisiblesDe(sesion, filas, eliminables)
  return { editables, eliminables, leadsVisibles, aprobadas }
}

// Los paneles que nombra la URL, leídos sólo si la nombra: la edición (`?editar=`) y los del «⋯» (`?panel=imagenes|vitrina&para=`); y si se publica en
// este origen (sin eso la vitrina no se lee ni se abre).
async function panelesDeLaPagina(
  parametros: Record<string, string | string[] | undefined>,
  sesion: Awaited<ReturnType<typeof requerirSesion>>,
  origen: { id: string; nombre: string },
  conSubasta: boolean,
) {
  const publicar = permisoDeVitrina(sesion.permisos, origen)
  const [enEdicion, paneles] = await Promise.all([
    vehiculoEnEdicion(parametros, sesion, origen.id),
    panelesDeLaUrl(parametros, sesion, {
      id: origen.id,
      conSubasta,
      publica: publicar.estado === 'habilitado',
    }),
  ])
  return { enEdicion, publicar, ...paneles }
}

// De a cuántos: lo que pide la URL, si no lo que eligió la persona.
function tamanoDeLaPagina(
  parametros: Record<string, string | string[] | undefined>,
  preferencia: number | null,
): number {
  return tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia,
    maximo: MAXIMO_DE_PAGINA_DE_VEHICULOS,
  })
}

type FuentesDeLaPagina = Parameters<typeof esquemaDeFiltros>[0] & {
  campos: Parameters<typeof condicionesDe>[0]
  vitrina: NonNullable<Parameters<typeof condicionesDe>[2]>['vitrina']
}

// El esquema de los filtros (el por defecto del orden depende de «Subasta»: se mira antes), lo que pide la URL y el cursor de ese orden.
function filtrosDeLaPagina(
  parametros: Awaited<PageProps<'/vehiculos'>['searchParams']>,
  {
    fuentes,
    deSubasta,
    zona,
    limpiezaHasta,
    ahora,
  }: {
    fuentes: FuentesDeLaPagina
    deSubasta: boolean
    zona: string
    limpiezaHasta: string | null
    ahora: string
  },
) {
  const esquema = esquemaDeFiltros({
    ...fuentes,
    ...(limpiezaHasta === null ? {} : { limpieza: { activa: true } }),
    conSubasta: deSubasta,
    subastaElegida: esSubastaElegida(unParametro(parametros[FILTRO_SUBASTA])),
  })
  const valores = leerFiltros(esquema, parametros)
  const orden = ordenElegido(esquema, valores)
  const textoDelCursor = unParametro(parametros[CLAVE_DE_CURSOR])
  return {
    esquema,
    orden,
    condiciones: condicionesDe(fuentes.campos, valores, {
      zona,
      vitrina: fuentes.vitrina,
      ahora,
      ...(limpiezaHasta === null ? {} : { limpieza: { hasta: limpiezaHasta } }),
    }),
    cursor: orden === 'cierre' ? leerCursorDelCierre(textoDelCursor) : leerCursor(textoDelCursor),
  }
}

function SinOrigenes() {
  return (
    <EstadoSinPermiso descripcion="No tienes permiso para ver vehículos en ningún origen. Pídeselo a quien administra los roles." />
  )
}

// El inventario, una pestaña por origen. Las pestañas son los orígenes donde la persona tiene
// `vehiculos.ver` (también los desactivados); lo que ve adentro lo decide la RLS. El origen, los
// filtros y la página vienen en la URL, y lo que no corresponde se ignora.
// Con el Modo Live y el área oculta, la pantalla «Oculto en Modo Live» antes de leer nada (`loading.tsx` es su `<Suspense>`).
export default function PaginaVehiculos(props: PageProps<'/vehiculos'>) {
  return (
    <SiSeVeEnElLive area="vehiculos">
      <Inventario {...props} />
    </SiSeVeEnElLive>
  )
}

async function Inventario({ searchParams }: PageProps<'/vehiculos'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const visibles = origenesVisibles(sesion.permisos, datosO(await getOrigenes(true)))
  const origen = origenElegido(visibles, unParametro(parametros['origen']))
  if (!origen) return <SinOrigenes />

  // «Subasta», el orden «Cierre más próximo» y el atajo «Sin resolver» sólo existen en un origen de subasta.
  const deSubasta = origen.tipo === 'subasta'
  const [layout, fases, vistas, ajustes, vitrina, apibaraActiva, politica] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerFasesDeOrigen(origen.id),
    leerVistas('vehiculos'),
    getAjustes(),
    vitrinaDelOrigen(origen.id),
    // Sólo un origen de subasta trae fichas de apibara; el resto ni pregunta.
    deSubasta ? integracionActiva('apibara') : Promise.resolve(false),
    getPoliticaDeLimpieza(),
  ])
  const { campos, categorias } = datosO(layout)
  const fuentes = { campos, categorias, fases: datosO(fases), vitrina }
  // La limpieza automática sólo existe en un origen de subasta y con el interruptor encendido: apagada, no hay filtro ni insignias. «Hoy» es el de la zona de la empresa.
  const limpiezaActiva = deSubasta && politica.activa
  const hoy = hoyEnZona(ajustes.zonaHoraria)
  const tamano = tamanoDeLaPagina(parametros, sesion.preferencias.porPagina)
  // El instante del pedido: desde él cuentan las ventanas de «Subasta» y la cuenta regresiva de cada fila.
  const ahora = new Date().toISOString()
  const { esquema, orden, condiciones, cursor } = filtrosDeLaPagina(parametros, {
    fuentes,
    deSubasta,
    zona: ajustes.zonaHoraria,
    limpiezaHasta: limpiezaActiva ? limiteDeAviso(hoy) : null,
    ahora,
  })
  const [leida, paneles, sinResolver] = await Promise.all([
    buscarVehiculos({
      fuente: fuenteDelInventario(sesion.permisos, origen.id, orden),
      origenId: origen.id,
      condiciones,
      orden,
      cursor,
      tamano,
    }),
    panelesDeLaPagina(parametros, sesion, origen, deSubasta && apibaraActiva),
    deSubasta ? sinResolverDe(origen.id) : Promise.resolve(null),
  ])
  const pagina = datosO(leida)
  const { editables, eliminables, leadsVisibles, aprobadas } = await deLaPagina(
    sesion,
    pagina.filas,
  )
  return (
    <ListadoConCompartir
      origenes={visibles}
      origen={origen}
      {...fuentes}
      esquema={esquema}
      limpiezaHoy={limpiezaActiva ? hoy : null}
      ahora={ahora}
      pagina={pagina}
      orden={orden}
      porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_VEHICULOS) }}
      vistas={vistasDeOrigenesVisibles(datosO(vistas), visibles)}
      puedeConfigurarCampos={puede(sesion.permisos, 'origenes.gestionar')}
      permisoDeAlta={permisoDeAlta(sesion.permisos, origen)}
      editables={[...editables]}
      eliminables={[...eliminables]}
      leadsVisibles={[...leadsVisibles]}
      alcance={alcanceDeAvisos(sesion.permisos, origen.id, DOCUMENTOS_DEL_AVISO)}
      verPapelera={puedeAbrirLaPapelera(sesion.permisos)}
      aprobadas={aprobadas}
      paraCotizar={paraCotizarDe(sesion.permisos, origen)}
      {...delMenu(sesion.permisos, origen.id, deSubasta && apibaraActiva ? pagina.filas : null)}
      {...paneles}
      vistaPreferida={sesion.preferencias.vistaDeVehiculos}
      sinResolver={sinResolver}
      apibara={{
        activa: apibaraActiva,
        puedeConfigurar: puede(sesion.permisos, 'empresa.ajustes.gestionar'),
      }}
    />
  )
}
