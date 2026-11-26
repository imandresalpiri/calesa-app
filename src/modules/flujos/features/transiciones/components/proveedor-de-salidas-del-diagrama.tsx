'use client'

import type { ReactNode } from 'react'
import type { ResultadoDelLienzo } from '../../../entities/edicion-del-lienzo'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_DE_LA_SALIDA_A_QUITAR,
  CLAVE_DE_LA_SALIDA_EDITADA,
  CLAVE_EDITAR,
  CLAVE_ELIMINAR,
  PANEL_EDITAR_SALIDA,
  PANEL_ELIMINAR_SALIDA,
} from '../../../entities/transiciones/vista-de-salidas'
import { useFaseAbierta } from '../../configuracion/hooks/use-fase-abierta'
import {
  ContextoDeSalidasDelDiagrama,
  type SalidasDelDiagrama,
} from '../../configuracion/hooks/use-salidas-del-diagrama'
import { pedidosDeTransiciones } from '../hooks/pedidos-de-transiciones'
import { useEscrituraDeTransiciones } from '../hooks/use-escritura-de-transiciones'

type Props = { flujo: FlujoParaConfigurar; children: ReactNode }

// El hueco `salidasDelDiagrama`: crear una salida arrastrando el asa de una fase a otra (`transicion_crear`, sin acción ni nota obligatoria, con la versión
// vigente del lienzo) y abrir o pedir quitar la de una flecha, en el inspector de su fase de origen y en un solo paso del historial. Un rechazo lo dice como
// las demás escrituras de salidas. Un `23505` sobre el id es el mismo pedido que ya había llegado: cuenta como hecho.
export function ProveedorDeSalidasDelDiagrama({ flujo, children }: Props) {
  const { rechazar } = useEscrituraDeTransiciones()
  const fase = useFaseAbierta()

  async function crear(
    pedido: { salidaId: string; de: string; a: string },
    vigente: string,
  ): Promise<ResultadoDelLienzo> {
    const envio = await pedidosDeTransiciones(flujo.ambito, flujo.id, vigente).crear(
      pedido.salidaId,
      pedido.de,
      { aFaseId: pedido.a, accion: null, notaObligatoria: false },
    )
    if (envio.ok) return { ok: true, version: envio.data.actualizadoEn }
    if ('sinRed' in envio) return { ok: false, motivo: 'sin-red' }
    if (envio.porCampo?.['id'] !== undefined) return { ok: true, version: null }
    rechazar(envio)
    return { ok: false, motivo: envio.error.codigo === 'conflicto' ? 'conflicto' : 'rechazo' }
  }

  const valor: SalidasDelDiagrama = {
    crear,
    abrir: (salidaId, deFaseId) => {
      fase.abrir(deFaseId, {
        [CLAVE_EDITAR]: PANEL_EDITAR_SALIDA,
        [CLAVE_DE_LA_SALIDA_EDITADA]: salidaId,
      })
    },
    quitar: (salidaId, deFaseId) => {
      fase.abrir(deFaseId, {
        [CLAVE_ELIMINAR]: PANEL_ELIMINAR_SALIDA,
        [CLAVE_DE_LA_SALIDA_A_QUITAR]: salidaId,
      })
    },
  }
  return <ContextoDeSalidasDelDiagrama value={valor}>{children}</ContextoDeSalidasDelDiagrama>
}
