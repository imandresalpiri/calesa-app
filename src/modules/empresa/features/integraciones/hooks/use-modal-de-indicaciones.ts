'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  agregarAtajo,
  cambiarAtajo,
  moverAtajo,
  quitarAtajo,
  type CambioDeAtajo,
  type DireccionDelAtajo,
} from '../../../entities/asistente-ia/atajos'
import { configDelAsistente, type AtajoDelAsistente } from '../../../entities/asistente-ia/config'
import type { Integracion } from '../../../entities/integraciones'
import { guardarIndicacionesDelAsistente } from '../actions/guardar-indicaciones-del-asistente'
import {
  claveDelCampoDelAtajo,
  esquemaGuardarIndicaciones,
  motivosDeLasIndicaciones,
} from '../schemas/asistente'

type Opciones = {
  abierto: boolean
  alCerrar: () => void
  // La fila del asistente con su versión: llega por props al abrir y nunca va en la `key`.
  asistente: Integracion
}

// Lo que se compara con lo guardado: sin los espacios de las puntas, como se guarda.
const comparable = (promptBase: string, atajos: readonly AtajoDelAsistente[]) =>
  JSON.stringify([
    promptBase.trim(),
    atajos.map((a) => [a.id, a.nombre.trim(), a.instruccion.trim(), a.activo, a.maxTokens]),
  ])

// «Prompt base y atajos» en su modal: un borrador local de la lista (sumar, quitar, mover, cambiar) que se guarda entero, con el prompt base, en
// una escritura con la versión de la fila. Cada atajo tiene sus motivos, por su id.
export function useModalDeIndicaciones({ abierto, alCerrar, asistente }: Opciones) {
  const guardada = configDelAsistente(asistente.config)
  const [promptBase, setPromptBase] = useState(guardada.promptBase)
  const [atajos, setAtajos] = useState<readonly AtajoDelAsistente[]>(guardada.atajos)
  // El atajo recién sumado: su nombre recibe el foco.
  const [nuevo, setNuevo] = useState<string | null>(null)
  // El último movimiento: el foco vuelve al «⋯» de la fila movida (`useFocoTrasMover`).
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)
  const entrada = {
    actualizadoEnEsperado: asistente.actualizadoEn,
    promptBase,
    atajos: [...atajos],
  }
  const hayCambios =
    comparable(promptBase, atajos) !== comparable(guardada.promptBase, guardada.atajos)

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: asistente.actualizadoEn,
    validar: () => {
      if (!hayCambios) {
        return null
      }
      const leido = esquemaGuardarIndicaciones.safeParse(entrada)
      return leido.success ? null : motivosDeLasIndicaciones(leido.error.issues, atajos)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(
            guardarIndicacionesDelAsistente(entrada),
            'No se pudieron guardar el prompt base y los atajos.',
          )
        : { ok: true, data: { actualizadoEn: asistente.actualizadoEn } },
    alGuardar: () => {
      avisarExito('Prompt base y atajos guardados')
      alCerrar()
    },
  })
  const { quitarMotivo } = formulario

  return {
    formulario,
    promptBase,
    atajos,
    nuevo,
    movimiento,
    cambiarPromptBase: (valor: string) => {
      setPromptBase(valor)
      quitarMotivo('promptBase')
    },
    agregar: () => {
      const id = crypto.randomUUID()
      setAtajos((lista) => agregarAtajo(lista, id))
      setNuevo(id)
      quitarMotivo('atajos')
    },
    quitar: (id: string) => {
      setAtajos((lista) => quitarAtajo(lista, id))
      quitarMotivo('atajos')
    },
    mover: (id: string, direccion: DireccionDelAtajo) => {
      setAtajos((lista) => moverAtajo(lista, id, direccion))
      setMovimiento((antes) => ({ id, direccion, veces: (antes?.veces ?? 0) + 1 }))
    },
    cambiar: (id: string, cambio: CambioDeAtajo) => {
      setAtajos((lista) => cambiarAtajo(lista, id, cambio))
      if (cambio.nombre !== undefined) quitarMotivo(claveDelCampoDelAtajo(id, 'nombre'))
      if (cambio.instruccion !== undefined) quitarMotivo(claveDelCampoDelAtajo(id, 'instruccion'))
    },
  }
}

export type ModalDeIndicaciones = ReturnType<typeof useModalDeIndicaciones>
