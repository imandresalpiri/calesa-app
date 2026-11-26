'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina } from '@/shared/lib/paginacion'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { VehiculosVisibles } from '../../../entities/listado/ruta-del-vehiculo'
import type { PaginaAgrupada, PedidoDelGrupo } from '../../../entities/listado/grupos-del-listado'
import { tituloDelModalDelGrupo } from '../../../entities/listado/grupos-del-listado'
import { TOPE_DE_COINCIDENCIAS } from '../../../entities/listado/listado'
import { useModalDelGrupo } from '../hooks/use-modal-del-grupo'
import { ModalDelGrupoDiferido } from './grupo'
import { SinFilas } from './sin-filas'
import { TablaDeCotizaciones } from './tabla-de-cotizaciones'
import { TarjetasDeCotizaciones } from './tarjetas-de-cotizaciones'
import type {
  CompartirDe,
  FilaDeCotizacion,
  HuecosDeLaLista,
  MenuDeFila,
  OrigenDelListado,
} from './tipos'

type Props = {
  pagina: PaginaAgrupada<FilaDeCotizacion>
  // La vista de escritorio (en el celular, siempre tarjetas).
  vista: VistaDeLista
  origenes: readonly OrigenDelListado[]
  accionDeVacio?: ReactNode
  vacioDeLoFiltrado: string | null
  alAbrir: (id: string) => void
  abierta: string | null
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  huecos?: HuecosDeLaLista | undefined
  rutaDeClientes: string | null
  vehiculosVisibles?: VehiculosVisibles | undefined
  // Los filtros de la página, para el modal de un grupo (las del vehículo que coinciden).
  filtrosDelGrupo: Omit<PedidoDelGrupo, 'vehiculoId' | 'cursor'>
  acotada: boolean
}

// «Seguir buscando»: la misma URL con el cursor de donde quedó la base.
function SeguirBuscando({ cursor }: { cursor: string }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.set(CLAVE_DE_CURSOR, cursor)
  return (
    <AvisoDeTope
      texto="Revisamos muchas cotizaciones sin completar la página."
      camino={
        <Link
          href={`${ruta}?${parametros.toString()}` as Route}
          className="underline hover:text-(--color-ink)"
        >
          Seguir buscando
        </Link>
      }
    />
  )
}

// Lo que el modal sabe de su grupo: con él en la página, su cabeza (primera, con el nombre del vehículo) y el orden; sin él (un enlace a un grupo que no está), sólo lo que lee.
function datosDelGrupo(
  pagina: Props['pagina'],
  filtros: Props['filtrosDelGrupo'],
  vehiculoId: string,
) {
  const entrada = pagina.filas.find((una) => una.tipo === 'grupo' && una.vehiculoId === vehiculoId)
  const grupo = entrada?.tipo === 'grupo' ? entrada : undefined
  return {
    titulo: tituloDelModalDelGrupo(grupo?.cabeza.vehiculo),
    cabeza: grupo?.cabeza ?? null,
    pedido: { ...filtros, vehiculoId },
    ordenId: filtros.texto === undefined ? (grupo?.ordenId ?? null) : null,
  }
}

// El modal de las cotizaciones de un vehículo: abierto en la URL (`useModalDelGrupo`), llega recién al primer clic (`diferido()`) y, una vez visto, queda montado para irse con
// su animación. Elegir una línea lo cierra y abre su resumen en el mismo paso.
function useGrupoEnElModal({
  pagina,
  filtrosDelGrupo,
  huecos,
  alAbrir,
}: Pick<Props, 'pagina' | 'filtrosDelGrupo' | 'huecos' | 'alAbrir'>) {
  const modal = useModalDelGrupo()
  const montado = useAbiertoAlgunaVez(modal.abierto)
  // Lo último que nombró la URL se conserva mientras el modal se cierra.
  const vehiculoId = useUltimo(modal.abierto ? modal.vehiculoId : null)
  return {
    abrirGrupo: modal.abrir,
    modal:
      montado && vehiculoId !== null ? (
        <ModalDelGrupoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          {...datosDelGrupo(pagina, filtrosDelGrupo, vehiculoId)}
          Comparar={huecos?.Comparar}
          alAbrir={(id) => {
            modal.cerrar()
            alAbrir(id)
          }}
        />
      ) : null,
  }
}

// La lista o el estado que corresponda (`SinFilas`). Una sola vista (`<UnaSolaVista preferida>`): la tabla sólo en escritorio y si la persona la eligió; si no, las
// tarjetas. Agrupada, «N cotizaciones de este vehículo» abre un modal con las del vehículo (`?panel=cotizaciones-del-vehiculo&vehiculo=`). Sin total ni «Página N de M»: dónde estás y Anterior o
// Siguiente; si la base recorrió su tope sin completar la página, «Seguir buscando».
export function ResultadoDelListado({
  pagina,
  vista,
  origenes,
  accionDeVacio,
  vacioDeLoFiltrado,
  alAbrir,
  abierta,
  menuDeFila,
  compartirDe,
  huecos,
  rutaDeClientes,
  vehiculosVisibles,
  filtrosDelGrupo,
  acotada,
}: Props) {
  const grupos = useGrupoEnElModal({ pagina, filtrosDelGrupo, huecos, alAbrir })
  if (pagina.filas.length === 0) {
    return (
      <>
        {pagina.cortada === null ? (
          <SinFilas accionDeVacio={accionDeVacio} vacioDeLoFiltrado={vacioDeLoFiltrado} />
        ) : (
          <SeguirBuscando cursor={pagina.cortada} />
        )}
        {grupos.modal}
      </>
    )
  }
  const ubicacion = ubicacionDeLaPagina({
    ...pagina,
    filas: pagina.filas.map((entrada) => ({ id: entrada.ordenId, creadoEn: entrada.ordenEn })),
  })
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacion} />
      <UnaSolaVista
        preferida={vista}
        tabla={() => (
          <TablaDeCotizaciones
            entradas={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
            vehiculosVisibles={vehiculosVisibles}
            abrirGrupo={grupos.abrirGrupo}
          />
        )}
        tarjetas={() => (
          <TarjetasDeCotizaciones
            entradas={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
            compartirDe={compartirDe}
            huecos={huecos}
            rutaDeClientes={rutaDeClientes}
            vehiculosVisibles={vehiculosVisibles}
            abrirGrupo={grupos.abrirGrupo}
          />
        )}
      />
      {acotada ? (
        <AvisoDeTope
          texto={`La búsqueda nombra a lo sumo ${String(TOPE_DE_COINCIDENCIAS)} clientes, vehículos o personas, los más recientes.`}
          camino="Escribe más para afinarla."
        />
      ) : null}
      {pagina.cortada === null ? null : <SeguirBuscando cursor={pagina.cortada} />}
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
      {grupos.modal}
    </div>
  )
}
