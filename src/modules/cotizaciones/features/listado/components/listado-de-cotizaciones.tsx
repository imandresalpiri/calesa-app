'use client'

import { useState, type ReactNode } from 'react'
import type { VistaGuardada } from '@/modules/equipo/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { FilterShell } from '@/shared/ui/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { textoDelAviso, textoDelVacio } from '../../../entities/listado/aviso-del-listado'
import {
  cotizacionDeLaEntrada,
  type PaginaAgrupada,
  type PedidoDelGrupo,
} from '../../../entities/listado/grupos-del-listado'
import type { LecturaDelServidor } from '../../../entities/listado/resumen-del-listado'
import { useAgruparCotizaciones } from '../hooks/use-agrupar-cotizaciones'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { useVistaDeCotizaciones } from '../hooks/use-vista-de-cotizaciones'
import { AvisoDeLoFiltrado } from './aviso-de-lo-filtrado'
import type { VehiculosVisibles } from '../../../entities/listado/ruta-del-vehiculo'
import { ResumenDeCotizacionDiferido, VistasDeCotizacionesDiferido } from './diferidos'
import { NuevaCotizacion } from './nueva-cotizacion'
import { useOpcionesDelListado } from './opciones-del-listado'
import { ResultadoDelListado } from './resultado-del-listado'
import type {
  CompartirDe,
  FilaDeCotizacion,
  HuecosDeLaLista,
  MenuDeFila,
  OrigenDelListado,
} from './tipos'
import type {
  AprobarEnDelResumen,
  HuecosDelResumen,
  QuienDelResumen,
} from '../../hoja/components/huecos-del-resumen'

type Props = {
  esquema: EsquemaDeFiltros
  // La página: grupos y cotizaciones solas (agrupada) o sólo cotizaciones solas (sin agrupar).
  pagina: PaginaAgrupada<FilaDeCotizacion>
  // Con una búsqueda, alguna fuente tenía más coincidencias que el tope (`PaginaDelListado.acotada`).
  acotada: boolean
  // La vista que eligió la persona para escritorio (`cotizaciones.vista`); nula = nunca eligió (tarjetas).
  vistaPreferida: VistaDeLista | null
  // Si la persona pide la lista agrupada (la URL o su preferencia) y si esta página lo está (con `?vehiculo=` no lo está aunque se pida).
  agruparPedido: boolean
  // Las vistas guardadas de quien mira (T15), como en `/leads` y `/vehiculos`.
  vistas: readonly VistaGuardada[]
  // El «⋯» de cada fila, de cada tarjeta y del resumen, «Compartir» de cada tarjeta y del resumen y los diálogos que abren (uno por pantalla): los une `src/app`, que
  // junta lo de cada área.
  menuDeFila?: MenuDeFila
  compartirDe?: CompartirDe
  dialogos?: ReactNode
  // La imagen de cada tarjeta y «Comparar» de un grupo (de otras áreas, por hueco).
  huecos?: HuecosDeLaLista
  // La ruta de las fichas de los clientes, si quien mira ve leads (el cliente de la tarjeta va enlazado).
  rutaDeClientes: string | null
  // En qué orígenes quien mira ve vehículos (`vehiculos.ver`): el título de la cotización enlaza a la ficha de su vehículo (la lista y el resumen). Sin él, texto.
  vehiculosVisibles?: VehiculosVisibles | undefined
  // Los filtros de la página, para el despliegue de un grupo.
  filtrosDelGrupo: Omit<PedidoDelGrupo, 'vehiculoId' | 'cursor'>
  // «Ítems por página»: lo que dibuja esta página y hasta cuánto ofrece el selector.
  porPagina: { valor: number; opciones: readonly number[] }
  origenes: readonly OrigenDelListado[]
  // La ruta de «Nueva cotización», o null si quien mira no cotiza en ningún origen (sin el botón).
  rutaDeNueva: string | null
  // Con `?vehiculo=`: el título del vehículo (null si quien mira no lo ve). Sin él, `undefined`.
  vehiculo?: { titulo: string | null }
  // Con `?lead=`: el nombre del cliente (null si quien mira no tiene `leads.ver` o no ve al lead). Sin él, `undefined`. Pueden llegar los dos.
  lead?: { nombre: string | null }
  // Lo que el servidor leyó de la cotización de `?cotizacion=` cuando no está en la página (null si no hay clave, no es un guid o está en la página).
  delServidor: LecturaDelServidor | null
  // Lo que un área suma al grupo «Más» de «Vista y opciones» (la papelera): ya dibujado por la página, que lo pasa sólo si quien mira lo ve. Sin él, no hay «Más».
  junto?: ReactNode
  // Lo que las áreas llenan en el resumen (las pestañas) y lo que quien mira puede hacer con cada cotización de la página, por id (lo calcula el servidor).
  huecosDelResumen?: HuecosDelResumen
  quienesDelResumen?: Readonly<Record<string, QuienDelResumen>>
  // Para «De este vehículo» del resumen: dónde aprueba quien mira y qué hacer tras aprobar.
  aprobarEn?: AprobarEnDelResumen
  alCambiarLaAprobada?: () => void
}

// El listado de cotizaciones: búsqueda, filtros, «Vista y opciones» (tabla o tarjetas, «Agrupar por vehículo», vistas guardadas), «Nueva cotización» y la lista con
// su «⋯». Todo el estado (filtros, página, vista, agrupación) vive en la URL; el modal de un grupo, en `?panel=`.
export function ListadoDeCotizaciones(props: Props) {
  const { esquema, pagina, vistas, porPagina, rutaDeNueva, vehiculo, lead, junto, origenes } = props
  const resumen = useResumenDeCotizacion()
  // El resumen llega recién al abrirse (`diferido()`) y, una vez visto, queda montado para irse con su animación.
  const resumenMontado = useAbiertoAlgunaVez(resumen.texto !== null)
  // Los diálogos van dentro del resumen sólo con su código ya llegado (`alMontarse`): mientras llega, en el listado, así un `?panel=` de la URL no espera al chunk.
  const [resumenListo, setResumenListo] = useState(false)
  const enElResumen = resumen.texto !== null && resumenListo
  const vista = useVistaDeCotizaciones(props.vistaPreferida)
  const agrupar = useAgruparCotizaciones(props.agruparPedido)
  const nueva = rutaDeNueva === null ? undefined : <NuevaCotizacion ruta={rutaDeNueva} />
  // «Vista y opciones»: las vistas guardadas (llegan al abrir el panel) y, si la página lo pasó, «Más» con la papelera. El vacío ofrece sólo «Nueva».
  const opciones = useOpcionesDelListado({
    vista,
    agrupar,
    vistas: (
      <VistasDeCotizacionesDiferido
        esquema={esquema}
        vistas={vistas}
        vista={vista.vista}
        agrupar={agrupar.agrupar}
      />
    ),
    ...(junto === undefined ? {} : { junto }),
  })
  const aviso = textoDelAviso({ lead, vehiculo, agrupar: agrupar.agrupar })
  return (
    <div className="grid gap-4">
      {/* El título de la página para quien lee en voz alta: la barra de filtros ocupa la cabecera (como en `/leads`). */}
      <h1 className="sr-only">Cotizaciones</h1>
      <FilterShell esquema={esquema} porPagina={porPagina} acciones={nueva} opciones={opciones}>
        {aviso === null ? null : <AvisoDeLoFiltrado texto={aviso} />}
        <ResultadoDelListado
          pagina={pagina}
          vista={vista.vista}
          origenes={origenes}
          accionDeVacio={nueva}
          vacioDeLoFiltrado={textoDelVacio({
            lead: lead !== undefined,
            vehiculo: vehiculo !== undefined,
          })}
          alAbrir={resumen.abrir}
          abierta={resumen.id}
          menuDeFila={props.menuDeFila}
          compartirDe={props.compartirDe}
          huecos={props.huecos}
          rutaDeClientes={props.rutaDeClientes}
          vehiculosVisibles={props.vehiculosVisibles}
          filtrosDelGrupo={props.filtrosDelGrupo}
          acotada={props.acotada}
        />
      </FilterShell>
      {/* Los diálogos van una sola vez: dentro del resumen mientras está abierto (un modal hermano del Drawer contaría como un clic afuera y lo cerraría), y aquí si no. */}
      {enElResumen ? null : props.dialogos}
      {resumenMontado ? (
        <ResumenDeCotizacionDiferido
          filas={pagina.filas.map(cotizacionDeLaEntrada)}
          origenes={origenes}
          delServidor={props.delServidor}
          huecos={props.huecosDelResumen}
          quienes={props.quienesDelResumen}
          aprobarEn={props.aprobarEn}
          vehiculosVisibles={props.vehiculosVisibles}
          alCambiarLaAprobada={props.alCambiarLaAprobada}
          menuDeFila={props.menuDeFila}
          compartirDe={props.compartirDe}
          dialogos={enElResumen ? props.dialogos : null}
          alMontarse={setResumenListo}
        />
      ) : null}
    </div>
  )
}
