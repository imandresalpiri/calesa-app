'use client'

import { TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  PANEL_DE_VIGENCIA,
  textoDeLaVigencia,
  type AjustesDeCotizacion,
} from '../../../entities/ajustes-de-cotizacion'
import { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from '../../../entities/motivos'
import { ModalDeVigenciaDiferido } from './diferidos'

type Props = {
  ajustes: AjustesDeCotizacion
  // Configurar el cotizador en todos los orígenes (`puedeCambiarAjustesDeCotizacion`): sin eso se lee y no se cambia.
  puedeCambiar: boolean
  puedeIrARoles: boolean
}

// La tarjeta «Vigencia» de Configuración › Orígenes: «N días». Tocarla, o «Editar vigencia…» del «⋯», abre el formulario en su modal (`?panel=vigencia`). Sin poder
// cambiarla, la acción va apagada con su motivo, la tarjeta no abre nada (el motivo lo dice el `<Aviso>` del bloque) y un `?panel=vigencia` escrito a mano no abre: se avisa y
// la URL se limpia.
export function TarjetaDeVigencia({ ajustes, puedeCambiar, puedeIrARoles }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_VIGENCIA)
  const apertura = useApertura(panel.abierto)
  const rechazada = useRevisionAlAbrir(
    panel.abierto ? String(apertura) : null,
    puedeCambiar ? null : MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION,
    panel.cerrar,
  )
  const abierto = panel.abierto && !rechazada
  const montar = useAbiertoAlgunaVez(abierto)
  return (
    <>
      <TarjetaTocable
        titulo="Vigencia"
        accion="Editar vigencia"
        motivo={puedeCambiar ? null : MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION}
        abrir={panel.abrir}
      >
        <p className="text-(length:--text-base) text-(--color-ink)">
          {textoDeLaVigencia(ajustes.vigenciaDias)}
        </p>
      </TarjetaTocable>
      {montar ? (
        <ModalDeVigenciaDiferido
          abierto={abierto}
          alCerrar={panel.cerrar}
          ajustes={ajustes}
          puedeIrARoles={puedeIrARoles}
        />
      ) : null}
    </>
  )
}
