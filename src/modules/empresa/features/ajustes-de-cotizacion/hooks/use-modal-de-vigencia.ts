'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { validarVigencia, type AjustesDeCotizacion } from '../../../entities/ajustes-de-cotizacion'
import { guardarAjustesDeCotizacion } from '../actions/guardar-ajustes-de-cotizacion'

const MENSAJE_DE_VALIDACION = 'Revisa la vigencia.'

type Opciones = {
  ajustes: AjustesDeCotizacion
  abierto: boolean
  alCerrar: () => void
}

// La vigencia en su modal: los días tal cual se escriben (el rango se dice junto al campo antes de enviar). Lo que la base rechaza vuelve con su motivo; un
// conflicto (`PT409`) ofrece «Recargar» y lo escrito queda. Sin cambios, guardar cierra. La versión entra por props al abrir.
export function useModalDeVigencia({ ajustes, abierto, alCerrar }: Opciones) {
  const [dias, setDias] = useState(String(ajustes.vigenciaDias))
  const hayCambios = dias.trim() !== String(ajustes.vigenciaDias)
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: ajustes.actualizadoEn,
    validar: () => {
      const validado = hayCambios ? validarVigencia(dias) : { ok: true as const }
      return validado.ok ? null : { vigenciaDias: validado.motivo }
    },
    pedir: async () => {
      const validado = validarVigencia(dias)
      if (!hayCambios || !validado.ok) {
        return { ok: true, data: { actualizadoEn: ajustes.actualizadoEn } }
      }
      return enviarAccion(
        guardarAjustesDeCotizacion({
          vigenciaDias: validado.dias,
          actualizadoEnEsperado: ajustes.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito('Vigencia guardada.')
      alCerrar()
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'vigenciaDias' : null,
  })
  return {
    dias,
    escribirDias: (valor: string) => {
      setDias(valor)
      formulario.quitarMotivo('vigenciaDias')
    },
    motivo: formulario.errores['vigenciaDias'] ?? null,
    formulario,
  }
}
