'use client'

import { cn } from 'cn'
import { useRegional } from '@/shared/ui/regional'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { PaginaDeActividad } from '../../../entities/actividad'
import type { OpcionDeActividad, PedidoDeActividad } from '../../../entities/filtros'
import { useCambioAbierto } from '../../diff/hooks/use-cambio-abierto'
import { useActividad } from '../hooks/use-actividad'
import { useFiltrosDeActividad } from '../hooks/use-filtros-de-actividad'
import { BarraDeFiltros } from './barra-de-filtros'
import { DrawerDelCambioDiferido } from './diferidos'
import { ResultadoDeActividad } from './resultado-de-actividad'

type Props = {
  inicial: PaginaDeActividad
  pedido: PedidoDeActividad
  personas: readonly OpcionDeActividad[]
  entidades: readonly OpcionDeActividad[]
  hoy: string
  diasDeActividad: number
}

// `/actividad`: los filtros como chips arriba y la actividad por día, cada cambio como frase con «Ver detalle», que abre su drawer
// (`?cambio=`). La página le pone una `key` por filtros: otros filtros empiezan de cero. Un `?cambio=` que no está en lo cargado (o que quien
// mira no ve) abre el mismo drawer.
export function ListadoDeActividad({ inicial, pedido, personas, entidades, ...resto }: Props) {
  const { zonaHoraria } = useRegional()
  const filtros = useFiltrosDeActividad()
  const cambio = useCambioAbierto()
  const actividad = useActividad({ inicial, pedido, zona: zonaHoraria })
  const montarDetalle = useAbiertoAlgunaVez(cambio.abierto)
  const registroTitulo =
    pedido.registro === null
      ? null
      : (actividad.filas.find((f) => f.registroTitulo !== null)?.registroTitulo ?? null)
  const hayFiltros = pedido.actor !== null || pedido.tabla !== null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BarraDeFiltros
        personas={personas}
        entidades={entidades}
        pedido={pedido}
        registroTitulo={registroTitulo}
        filtros={filtros}
        actividad={actividad}
        zona={zonaHoraria}
      />
      <div
        aria-busy={filtros.pendiente}
        className={cn(
          'min-w-0 transition-opacity duration-(--dur-rapida)',
          filtros.pendiente && 'opacity-60',
        )}
      >
        <ResultadoDeActividad
          {...resto}
          actividad={actividad}
          zona={zonaHoraria}
          hayFiltros={hayFiltros}
          limpiar={filtros.limpiar}
          idAbierto={cambio.id}
          abrir={cambio.abrir}
        />
      </div>
      {montarDetalle ? (
        <DrawerDelCambioDiferido
          abierto={cambio.abierto}
          alCerrar={cambio.cerrar}
          texto={cambio.texto}
        />
      ) : null}
    </div>
  )
}
