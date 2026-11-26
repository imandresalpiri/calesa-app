'use client'

import type { ReactNode } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ResultadoDelLienzo } from '../../../entities/edicion-del-lienzo'
import { motivoSinOrdenDeFases } from '../../../entities/fases/orden-de-fases'
import { PANEL_NUEVA_FASE, motivoParaNoAbrirNuevaFase } from '../../../entities/fases/panel-de-fase'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { textoDePosicion, type CambioDePosicion } from '../../../entities/posiciones-del-diagrama'
import type { Punto } from '../../../entities/disposicion-del-diagrama'
import {
  ContextoDeFasesDelDiagrama,
  type FasesDelDiagrama,
} from '../../configuracion/hooks/use-fases-del-diagrama'
import { useEscrituraDeFases } from '../hooks/use-escritura-de-fases'
import { CLAVE_DE_LA_POSICION_PEDIDA } from '../hooks/use-modal-de-nueva-fase'
import { usePedidosDeFases } from '../hooks/use-pedidos-de-fases'

type Props = { flujo: FlujoParaConfigurar; children: ReactNode }

// El hueco `diagramaDeFases`: guardar dónde queda cada fase en el diagrama (`fase_posiciones_guardar`, todo o nada con la versión vigente del lienzo) y
// pedir «Nueva fase» en un punto (`?panel=nueva-fase&en=<x>,<y>`: el modal de siempre, que monta `AccionesDeLaLista`). Un rechazo lo dice como las demás
// escrituras de fases (el conflicto, arriba del flujo); el lienzo sólo sabe cómo terminó. Con la lista cortada no se mueve; al tope, no se crea.
export function ProveedorDelDiagramaDeFases({ flujo, children }: Props) {
  const pedir = usePedidosDeFases(flujo)
  const { rechazar } = useEscrituraDeFases()
  const url = usePanelPorUrl(PANEL_NUEVA_FASE, [CLAVE_DE_LA_POSICION_PEDIDA])
  const motivoDeMover = motivoSinOrdenDeFases(flujo)
  const motivoDeNuevaFase = motivoParaNoAbrirNuevaFase(flujo)
  const guardar = pedir.guardarPosiciones

  async function guardarPosiciones(
    cambios: readonly CambioDePosicion[],
    vigente: string,
  ): Promise<ResultadoDelLienzo> {
    const envio = await guardar(cambios, vigente)
    if (envio.ok) return { ok: true, version: envio.data.version }
    if ('sinRed' in envio) return { ok: false, motivo: 'sin-red' }
    rechazar(envio)
    return { ok: false, motivo: envio.error.codigo === 'conflicto' ? 'conflicto' : 'rechazo' }
  }

  function nuevaFaseEn(punto: Punto | null) {
    url.abrir(punto ? { [CLAVE_DE_LA_POSICION_PEDIDA]: textoDePosicion(punto) } : {})
  }

  const valor: FasesDelDiagrama = {
    motivoDeMover,
    motivoDeNuevaFase,
    guardarPosiciones,
    nuevaFaseEn,
  }
  return <ContextoDeFasesDelDiagrama value={valor}>{children}</ContextoDeFasesDelDiagrama>
}
