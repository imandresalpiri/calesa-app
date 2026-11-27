'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { AjustesDeUnRol } from '../../../entities/live-configuracion'
import { quitarRolDelLive } from '../actions/quitar-rol'

type Props = {
  abierto: boolean
  alCerrar: () => void
  fila: AjustesDeUnRol
}

// «Volver a lo por defecto» de un rol (`?panel=rol-por-defecto&rol=<id>`): se pierde lo elegido para ese rol. Lo que la base rechaza (un conflicto,
// con «Recargar») se avisa y el diálogo queda abierto.
export function VolverALoPorDefecto({ abierto, alCerrar, fila }: Props) {
  const quitar = useAction(quitarRolDelLive)
  async function confirmar() {
    if (fila.actualizadoEn === null) {
      alCerrar()
      return
    }
    const envio = await enviarAccion(
      quitar.executeAsync({ rolId: fila.rol.id, actualizadoEnEsperado: fila.actualizadoEn }),
      'No pudimos volver a lo por defecto.',
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    alCerrar()
    avisarExito(`«${fila.rol.nombre}» volvió a lo por defecto en el Modo Live.`)
  }
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={confirmar}
      titulo={`Volver a lo por defecto en «${fila.rol.nombre}»`}
      descripcion="Se pierde lo elegido para este rol en el Modo Live: vuelven vehículos y cotizaciones a la vista y lo demás oculto. Lo propio de cada persona sigue."
      etiquetaConfirmar="Volver a lo por defecto"
      enCurso={quitar.isPending}
    />
  )
}
