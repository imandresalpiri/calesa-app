'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  PREAJUSTES_DEL_ASISTENTE,
  configDelAsistente,
  guardarBorraLaClave,
  type PreajusteDelAsistente,
} from '../../../entities/asistente-ia/config'
import type { Integracion } from '../../../entities/integraciones'
import { guardarAsistente } from '../actions/guardar-asistente'
import { esquemaGuardarAsistente } from '../schemas/asistente'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  // La fila del asistente con su versión: llega por props al abrir y nunca va en la `key`.
  asistente: Integracion
}

// El proveedor del asistente en su modal: el preajuste, la dirección base y el modelo. Con DeepSeek los dos últimos son los del preajuste; al
// pasar a «Otro proveedor» quedan los que había, para editarlos.
export function useModalDeAsistenteIa({ abierto, alCerrar, asistente }: Opciones) {
  const guardada = configDelAsistente(asistente.config)
  const [preajuste, setPreajuste] = useState<PreajusteDelAsistente>(guardada.preajuste)
  const [urlBase, setUrlBase] = useState(guardada.urlBase)
  const [modelo, setModelo] = useState(guardada.modelo)
  const entrada = {
    actualizadoEnEsperado: asistente.actualizadoEn,
    preajuste,
    urlBase: urlBase.trim(),
    modelo: modelo.trim(),
  }
  const hayCambios =
    preajuste !== guardada.preajuste ||
    entrada.urlBase !== guardada.urlBase ||
    entrada.modelo !== guardada.modelo
  const sinClaveAlGuardar = guardarBorraLaClave(asistente, guardada.urlBase, entrada.urlBase)

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: asistente.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaGuardarAsistente.safeParse(entrada)
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(guardarAsistente(entrada), 'No se pudo guardar el proveedor del asistente.')
        : { ok: true, data: { actualizadoEn: asistente.actualizadoEn } },
    alGuardar: () => {
      avisarExito(
        sinClaveAlGuardar
          ? 'Proveedor guardado. Carga la clave del nuevo para activarlo.'
          : 'Proveedor del asistente guardado',
      )
      alCerrar()
    },
  })

  return {
    formulario,
    preajuste,
    urlBase,
    modelo,
    sinClaveAlGuardar,
    cambiarPreajuste: (valor: PreajusteDelAsistente) => {
      setPreajuste(valor)
      if (valor === 'deepseek') {
        setUrlBase(PREAJUSTES_DEL_ASISTENTE.deepseek.urlBase)
        setModelo(PREAJUSTES_DEL_ASISTENTE.deepseek.modelo)
      }
      formulario.quitarMotivo('urlBase')
      formulario.quitarMotivo('modelo')
    },
    cambiarUrlBase: (valor: string) => {
      setUrlBase(valor)
      formulario.quitarMotivo('urlBase')
    },
    cambiarModelo: (valor: string) => {
      setModelo(valor)
      formulario.quitarMotivo('modelo')
    },
  }
}
