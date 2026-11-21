import Link from 'next/link'
import { puede } from '@/modules/equipo'
import type { UnidadAbierta } from '@/modules/logistica'
import { PanelDeLaUnidadALaVista } from '@/modules/logistica/pantallas/unidad-item'
import {
  leerItemDelPanel,
  motivoParaNoEscribirCompras,
  type ItemDelPanel,
} from '@/modules/repuestos'
import { ComprasDelItemDiferido } from '@/modules/repuestos/pantallas/compras-del-panel'
import { ImagenesDelItemDiferido } from '@/modules/repuestos/pantallas/items-del-panel'
import { BloqueDeStockDelItem } from '@/modules/repuestos/pantallas/stock-del-panel'
import type { SeccionDeLaUnidad } from '@/modules/logistica/pantallas/unidad-item'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from '../logistica/huecos-de-la-unidad'
import { rutaDeRegistrarCompra, rutaDelPanel } from './[id]/paneles'

// Los bloques de `repuestos` en el panel del ítem, cada uno con su permiso: las imágenes (editables con `repuestos.editar` y el proyecto abierto), el stock (siempre) y las
// compras (sólo con `repuestos.costos.ver`; registrar, con `repuestos.costos.editar` y el proyecto abierto). Los enlaces llevan el proyecto del ítem: sirven también desde
// la Cadena.
function bloquesDelItem(item: ItemDelPanel, permisos: Permisos): SeccionDeLaUnidad[] {
  const cerrado = item.proyecto.cerrado
  const proyectoId = item.proyecto.id
  const bloques: SeccionDeLaUnidad[] = [
    {
      clave: 'imagenes',
      titulo: 'Imágenes',
      contenido: (
        <ImagenesDelItemDiferido
          item={{ id: item.id, descripcion: item.descripcion }}
          editable={puede(permisos, 'repuestos.editar') && !cerrado}
          cerrado={cerrado}
        />
      ),
    },
    {
      clave: 'stock',
      titulo: 'Stock',
      contenido: (
        <BloqueDeStockDelItem
          proyectoId={proyectoId}
          itemId={item.id}
          cantidad={item.cantidad}
          stockCantidad={item.stockCantidad}
        />
      ),
    },
  ]
  if (puede(permisos, 'repuestos.costos.ver')) {
    bloques.push({
      clave: 'compras',
      titulo: 'Compras',
      contenido: (
        <ComprasDelItemDiferido
          itemId={item.id}
          hrefRegistrar={rutaDeRegistrarCompra(proyectoId, item.id)}
          hrefVerTodas={rutaDelPanel(proyectoId, 'compras')}
          motivoParaNoRegistrar={motivoParaNoEscribirCompras({
            puedeEditarCostos: puede(permisos, 'repuestos.costos.editar'),
            cerrado,
          })}
        />
      ),
    })
  }
  return bloques
}

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

// El ítem con ese id y su panel con las secciones a la vista («Qué falta» primero, con `?destino=` ya abierto), o el estado que toque (8.13-2). `repuestos` lee el ítem (fase, proyecto) bajo la RLS de quien mira y `logistica` dibuja el panel: `logistica` no importa
// `repuestos`, así que la unidad se arma aquí. Sin origen (el flujo de repuestos no lo tiene): los huecos se filtran por `repuestos.ver`. No va atada a la página: la «Cadena» la monta igual.
// Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
// `conCabecera={false}`: el drawer del proyecto ya tiene el título del ítem y su fila arriba.
type Props = { id: string; destino?: string | null; permisos: Permisos; conCabecera?: boolean }

export async function ItemAbierto({ id, destino = null, permisos, conCabecera = true }: Props) {
  if (!puede(permisos, 'repuestos.ver')) {
    return <EstadoSinPermiso />
  }
  const item = datosO(await leerItemDelPanel(id))
  if (item === null) {
    return <ItemNoDisponible />
  }
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
  return (
    <PanelDeLaUnidadALaVista
      unidad={unidad}
      origen={`Proyecto #${String(item.proyecto.numero)}`}
      fase={item.fase}
      huecos={huecos}
      aviso={aviso}
      destinoInicial={destino}
      bloques={bloquesDelItem(item, permisos)}
      conCabecera={conCabecera}
    />
  )
}
