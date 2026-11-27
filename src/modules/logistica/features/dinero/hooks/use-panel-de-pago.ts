'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Pago } from '../../../entities/dinero/pago'
import {
  CLAVE_DE_PAGO,
  motivoParaNoAbrirPago,
  PAGO_NUEVO,
  PANEL_PAGO,
  pagoDeLaUrl,
} from '../../../entities/dinero/paneles-de-pago'

type Permisos = { puedeEditar: boolean | null; puedeConfirmar: boolean | null }

// El panel de un pago en la URL (`?panel=pago&pago=<id|nuevo>`): se puede recargar y «atrás» lo cierra. «Registrar» abre con `nuevo`; tocar un pago, con su id (formulario si está sin confirmar y se puede
// editar; si no, su lectura). Un id que no está, o `nuevo` sin permiso de editar, no abre: se avisa y la URL se limpia, una vez, con la lista ya leída.
export function usePanelDePago(pagos: readonly Pago[] | null, permisos: Permisos) {
  const url = usePanelPorUrl(PANEL_PAGO, [CLAVE_DE_PAGO])
  const valor = url.valor(CLAVE_DE_PAGO)
  const apertura = useApertura(url.abierto)
  const editado = pagoDeLaUrl(pagos, valor)
  const revisar = url.abierto && pagos !== null && permisos.puedeEditar !== null
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${valor ?? ''}` : null,
    revisar
      ? motivoParaNoAbrirPago({ panel: PANEL_PAGO, valor, encontrado: editado, permisos })
      : null,
    url.cerrar,
  )
  const abierto = revisar && !rechazada
  // Mientras se va, el panel conserva el último pago que mostró.
  const ultimo = useUltimo(abierto ? editado : null)
  return {
    abierto,
    apertura,
    nuevo: valor === PAGO_NUEVO,
    // Abierto, el de la lista; si se fue de la lista (otra persona lo eliminó), el último que se mostró y `perdido`: lo escrito queda a la vista y no se guarda.
    original: valor === PAGO_NUEVO ? null : (editado ?? ultimo),
    perdido: abierto && valor !== PAGO_NUEVO && editado === null,
    abrirNuevo: () => {
      url.abrir({ [CLAVE_DE_PAGO]: PAGO_NUEVO })
    },
    abrirEdicion: (id: string) => {
      url.abrir({ [CLAVE_DE_PAGO]: id })
    },
    cerrar: url.cerrar,
  }
}
