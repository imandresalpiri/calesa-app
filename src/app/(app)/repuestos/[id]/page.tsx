import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense, type ComponentProps, type ReactNode } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import {
  PROYECTO_YA_NO_ESTA,
  TITULO_DEL_PANEL,
  clienteDeLaCabecera,
  cuentasDeLaHoja,
  destinoDelPanelDe,
  estadoDelProyecto,
  hayPagoDelCliente,
  itemAbiertoDe,
  leerCatalogosDeRepuestos,
  leerFlujoDeLosPasos,
  leerItemsDelProyecto,
  leerProyecto,
  type PanelDelPaso,
  type ProyectoDetallado,
} from '@/modules/repuestos'
import { CabeceraDeProyecto } from '@/modules/repuestos/pantallas/proyectos-detalle'
import { PagosDelProyectoDiferido } from '@/modules/logistica/pantallas/dinero-proyecto'
import { leerMonedasYTiposCambio } from '@/modules/empresa'
import { leerLeadParaEnlazar } from '@/modules/leads'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { ItemAbierto } from '../item-abierto'
import { HojaDelProyecto } from './hoja-del-proyecto'
import { CargandoUnProyectoCuerpo } from './loading'
import { CLAVE_DEL_PANEL_DEL_PASO, panelAbiertoDe, panelesDisponibles } from './paneles'
import { SeccionDeCompras } from './seccion-compras'
import { SeccionDeCotizaciones } from './seccion-cotizaciones'
import { EsqueletoDelVehiculo, VehiculoDelProyecto } from './vehiculo-del-proyecto'
import { EsqueletoDeLaTarjetaDelItem, VehiculoYClienteDelItem } from './vehiculo-y-cliente-del-item'
import { SiSeVeEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Proyecto de repuestos' }

// Un proyecto de repuestos (`docs/UX.md` › «Repuestos»): su cabecera (con el vehículo, que llega en su propio `<Suspense>`), la barra de progreso (las fases del flujo de repuestos y sus hitos), las pestañas
// fijas Ítems · Cotizaciones · Pagos · Compras (`?pestana=items|cotizaciones|pagos|compras`, cada una con su permiso; por defecto Ítems = la hoja, con el botón del siguiente en cada fila). Lo que
// no existe, está eliminado o quien mira no ve se dicen igual (D49), con un enlace al listado.
export default function PaginaDeUnProyecto({ params, searchParams }: PageProps<'/repuestos/[id]'>) {
  return (
    <Suspense fallback={<CargandoUnProyectoCuerpo />}>
      <SiSeVeEnElLive area="repuestos">
        <Proyecto params={params} searchParams={searchParams} />
      </SiSeVeEnElLive>
    </Suspense>
  )
}

function NoDisponible() {
  return (
    <EstadoVacio
      titulo={PROYECTO_YA_NO_ESTA}
      accion={
        <Link href={RUTAS.repuestos} className={buttonVariants({ variant: 'outline' })}>
          Volver a Repuestos
        </Link>
      }
    />
  )
}

// Las lecturas de la página tras el proyecto. Las que fallan suben al `error.tsx` (con «Reintentar»); el lead que quien mira no ve queda en nulo. El lead
// del cliente se lee sólo si lo hay y con `leads.ver`. El vehículo no va aquí: lo espera su `<Suspense>` en la cabecera (su error se dice ahí y la hoja sigue). El flujo de los pasos no lanza (dice que no se pudo leer) y el pago vivo se lee sólo con `repuestos.costos.ver`:
// si falla, queda en nulo (los pasos no dicen nada del pago).
async function leerLoDelProyecto(proyecto: ProyectoDetallado, permisos: Permisos) {
  return Promise.all([
    leerItemsDelProyecto(proyecto.id).then(datosO),
    leerCatalogosDeRepuestos().then(datosO),
    leerMonedasYTiposCambio().then(datosO),
    proyecto.leadId !== null && puede(permisos, 'leads.ver')
      ? leerLeadParaEnlazar(proyecto.leadId).then(datosO)
      : Promise.resolve(null),
    leerFlujoDeLosPasos(),
    puede(permisos, 'repuestos.costos.ver')
      ? hayPagoDelCliente(proyecto.id).then((r) => (r.ok ? r.data : null))
      : Promise.resolve(null),
  ])
}

async function Proyecto({
  params,
  searchParams,
}: Pick<PageProps<'/repuestos/[id]'>, 'params' | 'searchParams'>) {
  await connection()
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!puede(sesion.permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  // Sin la clave de un panel no se lee nada suyo: `?pestana=compras` sin `repuestos.costos.ver` deja sólo la hoja.
  // Un id que no es guid no existe: se dice igual que uno ajeno, y nunca entra a una URL armada.
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const disponibles = panelesDisponibles(sesion.permisos)
  const proyecto = datosO(await leerProyecto(id))
  if (proyecto === null) {
    return <NoDisponible />
  }
  const vehiculoLeido = proyecto.vehiculoId === null ? null : leerVehiculo(proyecto.vehiculoId)
  const vehiculo = vehiculoDeLaCabecera(vehiculoLeido)
  const [hoja, catalogos, monedas, lead, lectura, pago] = await leerLoDelProyecto(
    proyecto,
    sesion.permisos,
  )
  const permisos = sesion.permisos
  const cliente = clienteDeLaCabecera({
    leadId: proyecto.leadId,
    clienteNombre: proyecto.clienteNombre,
    lead,
  })
  const cerrado = proyecto.cerradoEn !== null
  const activas = monedas.monedas.filter((m) => m.activa)
  const abierto = panelAbiertoDe(unParametro(parametros[CLAVE_DEL_PANEL_DEL_PASO]), disponibles)
  return (
    <CabeceraDeProyecto
      proyecto={proyecto}
      vehiculo={vehiculo}
      cliente={cliente}
      estado={estadoDelProyecto({ cerradoEn: proyecto.cerradoEn, ...cuentasDeLaHoja(hoja.filas) })}
      puedeEditar={puede(permisos, 'repuestos.editar')}
      sinItems={hoja.filas.length === 0}
    >
      <RegistrarVisto modulo="repuestos" tipo="proyecto_repuestos" id={proyecto.id} />
      <HojaDelProyecto
        proyectoId={proyecto.id}
        filas={hoja.filas}
        hayMas={hoja.hayMas}
        catalogos={catalogos}
        monedas={activas}
        puedeEditar={puede(permisos, 'repuestos.editar')}
        cerrado={cerrado}
        lectura={lectura}
        pago={pago}
        disponibles={disponibles}
        titulos={TITULO_DEL_PANEL}
        numero={proyecto.numero}
        panelDelServidor={
          abierto === null
            ? null
            : {
                panel: abierto,
                contenido: contenidoDelPanel(abierto, {
                  proyectoId: proyecto.id,
                  hoja,
                  monedas: activas,
                  permisos,
                  cerrado,
                }),
              }
        }
        puede={puedeEnLaHoja(permisos)}
        seccionesDelItem={seccionesDelItem(
          itemAbiertoDe(parametros),
          destinoDelPanelDe(parametros),
          permisos,
          tarjetaDelProyecto(vehiculoLeido, proyecto.vehiculoEtiqueta, cliente),
        )}
      />
    </CabeceraDeProyecto>
  )
}

// El panel del ítem de `?item=` en dos columnas (lo del ítem a la izquierda, sus tarjetas a la derecha; `proyecto` es la tarjeta «Vehículo y cliente»): lo dibuja el servidor y la hoja lo pone en el drawer del ítem. Llevan el id
// del ítem (y `key`) para que, al abrir otro, la hoja muestre el esqueleto hasta que lleguen las suyas. Sin `?item=` (o con `?panel=`), nulo. Una URL con el id de otro proyecto abre igual: se lee por id, bajo la RLS.
function seccionesDelItem(
  itemId: string | null,
  destino: string | null,
  permisos: Permisos,
  proyecto: ReactNode,
): { id: string; contenido: ReactNode } | null {
  if (itemId === null) return null
  return {
    id: itemId,
    contenido: (
      <Suspense key={itemId} fallback={<EsqueletoListado filas={4} columnas={2} />}>
        <ItemAbierto
          id={itemId}
          destino={destino}
          permisos={permisos}
          enLaHoja
          proyecto={proyecto}
        />
      </Suspense>
    ),
  }
}

// La tarjeta «Vehículo y cliente» del panel del ítem: espera la lectura del vehículo que ya empezó la cabecera, en su propio `<Suspense>`.
function tarjetaDelProyecto(
  leido: ReturnType<typeof leerVehiculo> | null,
  etiqueta: string | null,
  cliente: ReturnType<typeof clienteDeLaCabecera>,
): ReactNode {
  return (
    <Suspense fallback={<EsqueletoDeLaTarjetaDelItem />}>
      <VehiculoYClienteDelItem leido={leido} etiqueta={etiqueta} cliente={cliente} />
    </Suspense>
  )
}

// El vehículo de la cabecera: su lectura empieza aquí, antes de esperar lo demás (va en paralelo), y la espera su `<Suspense>`. Un proyecto externo no lo lee.
function vehiculoDeLaCabecera(leido: ReturnType<typeof leerVehiculo> | null): ReactNode {
  if (leido === null) return null
  return (
    <Suspense fallback={<EsqueletoDelVehiculo />}>
      <VehiculoDelProyecto leido={leido} />
    </Suspense>
  )
}

// Lo que la hoja necesita saber de quien mira, calculado aquí: ni las claves ni `puede()` viajan al navegador.
function puedeEnLaHoja(permisos: Permisos) {
  return {
    mover: puede(permisos, 'repuestos.mover'),
    cotizar: puede(permisos, 'repuestos.cotizar'),
    registrarPago: puede(permisos, 'repuestos.costos.editar'),
    configurar: puede(permisos, 'repuestos.configurar'),
  }
}

type DatosDelPanel = {
  proyectoId: string
  hoja: { filas: ComponentProps<typeof HojaDelProyecto>['filas'] }
  monedas: { codigo: string; nombre: string }[]
  permisos: Permisos
  cerrado: boolean
}

// Lo que dibuja la pestaña abierta (la que no es Ítems). Compras y cotizaciones se leen recién al abrirse (`escala.md` › «Carga del cliente»); los pagos los lee el navegador.
function contenidoDelPanel(abierto: PanelDelPaso, datos: DatosDelPanel): ReactNode {
  const { proyectoId, hoja, monedas, permisos, cerrado } = datos
  const esqueleto = <EsqueletoListado filas={4} columnas={4} />
  if (abierto === 'compras') {
    return (
      <Suspense fallback={esqueleto}>
        <SeccionDeCompras
          proyectoId={proyectoId}
          items={hoja.filas.map((f) => ({ id: f.id, descripcion: f.descripcion }))}
          monedas={monedas}
          puedeEditarCostos={puede(permisos, 'repuestos.costos.editar')}
          cerrado={cerrado}
        />
      </Suspense>
    )
  }
  if (abierto === 'pagos') {
    return (
      <PagosDelProyectoDiferido
        proyectoId={proyectoId}
        cerrado={cerrado}
        puedeEditar={puede(permisos, 'repuestos.costos.editar')}
        puedeConfirmar={puede(permisos, 'logistica.pagos.confirmar')}
      />
    )
  }
  return (
    <Suspense fallback={esqueleto}>
      <SeccionDeCotizaciones
        proyectoId={proyectoId}
        monedas={monedas}
        cerrado={cerrado}
        puedeConfigurar={puede(permisos, 'repuestos.configurar')}
        puedeEditarItems={puede(permisos, 'repuestos.editar')}
      />
    </Suspense>
  )
}
