'use client'

import type { CambiosDeTipo, DatosParaCrear } from '../../../entities/documentos/formulario-de-tipo'
import type { TipoDeDocumento } from '../../../entities/documentos/tipo-de-documento'
import type { EscrituraDelModal } from './use-formulario-de-tipo'
import { useEscrituraDeTipos } from './use-escritura-de-tipos'
import { usePedidosDeTipos } from './use-pedidos-de-tipos'

// Las escrituras del modal «Nuevo tipo de documento», que no vive en el drawer de los tipos (lo abre también un requisito): las mismas actions, un
// envío a la vez.
export function useCrearTipo(): EscrituraDelModal {
  const escritura = useEscrituraDeTipos()
  const pedir = usePedidosDeTipos()
  return {
    enCurso: escritura.enCurso,
    crear: (id: string, flujoId: string | null, datos: DatosParaCrear) =>
      escritura.mandar(() => pedir.crear(id, flujoId, datos)),
    guardar: (tipo: TipoDeDocumento, cambios: CambiosDeTipo) =>
      escritura.mandar(() => pedir.guardar(tipo, cambios)),
  }
}
