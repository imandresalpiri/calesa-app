'use client'

import { useState } from 'react'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { OperacionesDelCatalogo, TextosDelCatalogo } from './tipos'

// El nombre que se escribe en el panel: agrega un elemento o renombra el elegido. Un rechazo del nombre (vacío, largo, «Ya existe
// «X».») va junto al campo; un conflicto (`PT409`) arriba, con «Recargar»; el resto, un aviso. Lo escrito queda siempre que algo falla.
export function useNombreDelCatalogo(
  operaciones: OperacionesDelCatalogo,
  textos: TextosDelCatalogo,
  alConflicto: (mensaje: string) => void,
) {
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<ElementoDeCatalogo | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  function tratarRechazo(envio: Envio<unknown> & { ok: false }) {
    const delCampo = 'porCampo' in envio ? envio.porCampo?.['nombre'] : undefined
    if (delCampo) {
      setError(delCampo)
    } else if (envio.error.codigo === 'conflicto') {
      alConflicto(envio.error.mensaje)
    } else if (envio.error.codigo === 'validacion' || envio.error.codigo === 'duplicado') {
      setError(envio.error.mensaje)
    } else {
      avisarError(envio.error)
    }
  }

  async function enviar(): Promise<void> {
    setError(undefined)
    if (nombre.trim() === '') {
      setError('Escribe un nombre.')
      return
    }
    const envio = editando
      ? await operaciones.renombrar(editando, nombre)
      : await operaciones.agregar(nombre)
    if (!envio.ok) {
      tratarRechazo(envio)
      return
    }
    avisarExito(editando ? textos.hechos.renombrado : textos.hechos.agregado)
    setNombre('')
    setEditando(null)
  }

  return {
    nombre,
    cambiar: (texto: string) => {
      setNombre(texto)
      setError(undefined)
    },
    editando,
    empezarARenombrar: (elemento: ElementoDeCatalogo) => {
      setEditando(elemento)
      setNombre(elemento.nombre)
      setError(undefined)
    },
    cancelar: () => {
      setEditando(null)
      setNombre('')
      setError(undefined)
    },
    error,
    enviar,
  }
}
