import Link from 'next/link'
import type { ReactNode } from 'react'
import { leerMonedasYTiposCambio } from '@/modules/empresa'
import { puede } from '@/modules/equipo'
import type { UnidadAbierta } from '@/modules/logistica'
import {
  CabeceraDeLaUnidad,
  QueFaltaDelItem,
  TarjetaDelHuecoDelItem,
} from '@/modules/logistica/pantallas/unidad-item'
import {
  leerCatalogosDeRepuestos,
  leerItem,
  leerItemDelPanel,
  motivoParaNoEscribirCompras,
  rutaDeLasImagenesDelItem,
  tarjetasDelItem,
  type ClaveDeTarjeta,
  type ItemDelPanel,
} from '@/modules/repuestos'
import {
  ComprasDelItemProveedorDiferido,
  ProveedorDelItemDiferido,
  TarjetaDeComprasDelItemDiferida,
} from '@/modules/repuestos/pantallas/compras-del-panel'
import {
  ColumnaDelItemDiferida,
  ItemEnDosColumnasDiferido,
  TarjetaDeImagenesDiferida,
  type LecturaDelItem,
} from '@/modules/repuestos/pantallas/items-del-panel'
import { TarjetaDeStockDelItem } from '@/modules/repuestos/pantallas/stock-del-panel'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from '../logistica/huecos-de-la-unidad'
import { rutaDeRegistrarCompra, rutaDelPanel } from './[id]/paneles'

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe.
function ItemNoDisponible() {
  return (
    <EstadoVacio
      titulo="Este repuesto ya no está disponible"
      descripcion="No existe o ya no tienes acceso."
      accion={
        <Link href={RUTAS.repuestos} className={buttonVariants({ variant: 'outline' })}>
          Volver a Repuestos
        </Link>
      }
    />
  )
}

// Lo que la Cadena muestra sin la hoja: la fila del ítem y los catálogos y monedas con que se escribe, de sólo lectura. Tres lecturas más que la hoja (que ya las tiene), todas de configuración o por
// id; un fallo de ellas sube al `error.tsx` de `(app)`, como el del ítem.
async function leerLoDelItem(id: string, cerrado: boolean): Promise<LecturaDelItem | null> {
  const [fila, catalogos, monedas] = await Promise.all([
    leerItem(id).then(datosO),
    leerCatalogosDeRepuestos().then(datosO),
    leerMonedasYTiposCambio().then(datosO),
  ])
  if (fila === null) return null
  return { fila, catalogos, monedas: monedas.monedas.filter((m) => m.activa), cerrado }
}

type Props = {
  id: string
  destino?: string | null
  permisos: Permisos
  // En la hoja del proyecto (`true`) el título del drawer ya dice qué ítem es y la columna izquierda se edita con lo vivo de la hoja; en la Cadena (`false`, por defecto) lleva la cabecera de
  // la unidad y la columna se lee tal como la leyó el servidor.
  enLaHoja?: boolean
  // Sólo en la hoja: la tarjeta «Vehículo y cliente» (la compone la página, que ya tiene el proyecto, el vehículo y el cliente).
  proyecto?: ReactNode
}

// El ítem con ese id y su panel en dos columnas, o el estado que toque (`docs/UX.md` › «Panel del ítem»). `repuestos` lee el ítem (fase, proyecto) bajo la RLS de quien mira y `logistica` dibuja lo
// suyo (qué falta y las tarjetas de documentos, notas e historial): `logistica` no importa `repuestos`, así que la unidad se arma aquí. Sin origen (el flujo de repuestos no lo tiene): los huecos se
// filtran por `repuestos.ver`. No va atada a la página: la «Cadena» la monta igual. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function ItemAbierto({
  id,
  destino = null,
  permisos,
  enLaHoja = false,
  proyecto = null,
}: Props) {
  if (!puede(permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  const item = datosO(await leerItemDelPanel(id))
  if (item === null) {
    return <ItemNoDisponible />
  }
  const lectura = enLaHoja ? null : await leerLoDelItem(id, item.proyecto.cerrado)
  const unidad: UnidadAbierta = {
    tipo: 'repuesto',
    id: item.id,
    origenId: null,
    titulo: item.descripcion,
    faseId: item.faseId,
    faseDesde: item.faseDesde,
    situacion: 'fase',
    proyecto: { id: item.proyecto.id, vehiculoId: item.proyecto.vehiculoId },
  }
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, {
    unidad,
    permisos,
    flujo: { ok: true, data: null },
  })
  const costosVer = puede(permisos, 'repuestos.costos.ver')
  const tarjetas = tarjetasDelItem({ costosVer, conProyecto: proyecto !== null })
  const derecha = tarjetas.map((clave) => (
    <TarjetaDelItem
      key={clave}
      clave={clave}
      item={item}
      unidad={unidad}
      huecos={huecos}
      permisos={permisos}
      proyecto={proyecto}
    />
  ))
  const panel = (
    <ItemEnDosColumnasDiferido
      itemId={item.id}
      izquierda={
        <ColumnaDelItemDiferida
          fase={item.fase}
          queFalta={<QueFaltaDelItem unidad={unidad} huecos={huecos} destinoInicial={destino} />}
          proveedor={costosVer ? <ProveedorDelItemDiferido /> : null}
          {...(lectura === null ? {} : { lectura })}
        />
      }
      derecha={derecha}
    />
  )
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" data-slot="panel-de-la-unidad">
      {enLaHoja ? (
        aviso ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p>
        ) : null
      ) : (
        <CabeceraDeLaUnidad
          unidad={unidad}
          origen={`Proyecto #${String(item.proyecto.numero)}`}
          fase={item.fase}
          aviso={aviso}
        />
      )}
      {costosVer ? (
        <ComprasDelItemProveedorDiferido itemId={item.id}>{panel}</ComprasDelItemProveedorDiferido>
      ) : (
        panel
      )}
    </div>
  )
}

type PropsDeTarjeta = {
  clave: ClaveDeTarjeta
  item: ItemDelPanel
  unidad: UnidadAbierta
  huecos: Parameters<typeof TarjetaDelHuecoDelItem>[0]['huecos']
  permisos: Permisos
  proyecto: ReactNode
}

// Una tarjeta de la derecha, con lo que su permiso deja: las imágenes (se editan con `repuestos.editar` y el proyecto abierto, en su panel), el stock (siempre), las compras (registrar, con
// `repuestos.costos.editar` y el proyecto abierto) y las de logística (cada una, si la persona ve su hueco). Los enlaces llevan el proyecto del ítem: sirven también desde la Cadena.
function TarjetaDelItem({
  clave,
  item,
  unidad,
  huecos,
  permisos,
  proyecto: delProyecto,
}: PropsDeTarjeta) {
  const proyectoId = item.proyecto.id
  switch (clave) {
    case 'imagenes':
      return (
        <TarjetaDeImagenesDiferida
          href={rutaDeLasImagenesDelItem(proyectoId, item.id)}
          descripcion={item.descripcion}
        />
      )
    case 'stock':
      return (
        <TarjetaDeStockDelItem
          proyectoId={proyectoId}
          itemId={item.id}
          cantidad={item.cantidad}
          stockCantidad={item.stockCantidad}
        />
      )
    case 'compras':
      return (
        <TarjetaDeComprasDelItemDiferida
          hrefRegistrar={rutaDeRegistrarCompra(proyectoId, item.id)}
          hrefVerTodas={rutaDelPanel(proyectoId, 'compras')}
          motivoParaNoRegistrar={motivoParaNoEscribirCompras({
            puedeEditarCostos: puede(permisos, 'repuestos.costos.editar'),
            cerrado: item.proyecto.cerrado,
          })}
        />
      )
    case 'documentos':
    case 'historial':
    case 'notas':
      return <TarjetaDelHuecoDelItem unidad={unidad} huecos={huecos} clave={clave} />
    case 'proyecto':
      return delProyecto
  }
}
