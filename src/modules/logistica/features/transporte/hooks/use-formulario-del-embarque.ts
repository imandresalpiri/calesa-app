'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  borradorDelEmbarque,
  cambiosDe,
  validarEmbarque,
  type BorradorDelEmbarque,
} from '../../../entities/transporte/borrador-del-embarque'
import type { EmbarqueLeido } from '../../../entities/transporte/embarque'
import type { EntidadGuardada } from '../../../entities/transporte/repositorio-de-embarques'
import { crearEmbarque } from '../actions/crear-embarque'
import { guardarEmbarque } from '../actions/guardar-embarque'

type Args = {
  // Nulo = «Nuevo embarque». Es el leído por la página: tras «Recargar» llega con la versión nueva.
  original: EmbarqueLeido | null
  origenId: string
  abierto: boolean
  alCerrar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del embarque.'

// La clave de cada campo del borrador en la base (la de `validarEmbarque` y la del `hint` de un rechazo): un motivo se borra al tipear en su campo.
export const CLAVE_EN_LA_BASE: Record<keyof BorradorDelEmbarque, string> = {
  booking: 'booking',
  naviera: 'naviera_id',
  puertoOrigen: 'puerto_origen_id',
  puertoDestino: 'puerto_destino_id',
  zarpeEstimado: 'zarpe_estimado_el',
  zarpe: 'zarpe_el',
  eta: 'eta_el',
  arribo: 'arribo_el',
  notas: 'notas',
}

const datosLeidos = (e: EmbarqueLeido) => ({
  booking: e.booking,
  naviera_id: e.navieraId,
  puerto_origen_id: e.puertoOrigenId,
  puerto_destino_id: e.puertoDestinoId,
  zarpe_estimado_el: e.zarpeEstimadoEl,
  zarpe_el: e.zarpeEl,
  eta_el: e.etaEl,
  arribo_el: e.arriboEl,
  notas: e.notas,
})

// El formulario de un embarque: crear lleva el id del intento (nace al abrir: cada apertura remonta el modal) y, creado, lleva a su página; editar manda sólo lo que cambió con la
// versión leída (sin diferencias, guardar es cerrar). Un `PT409` deja «Recargar», que trae la versión de ahora y conserva lo escrito; un booking repetido se dice en su campo.
export function useFormularioDelEmbarque({ original, origenId, abierto, alCerrar }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState(() => borradorDelEmbarque(original))
  const [valores, setValores] = useState<BorradorDelEmbarque>(inicial)

  const envio = useEnvioConVersion<EntidadGuardada | null>({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    version: original?.actualizadoEn ?? null,
    validar: () => {
      const validado = validarEmbarque(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarEmbarque(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      if (original === null) {
        return enviarAccion(
          crearEmbarque({ id: intento, origenId, datos: validado.datos }),
          MENSAJE_DE_VALIDACION,
        )
      }
      const cambios = cambiosDe(datosLeidos(original), validado.datos)
      return cambios === null
        ? { ok: true, data: null }
        : enviarAccion(
            guardarEmbarque({
              id: original.id,
              origenId,
              actualizadoEnEsperado: original.actualizadoEn,
              cambios,
            }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: (guardado) => {
      if (original === null) {
        avisarExito('Embarque creado.')
        router.push(embarqueDeLogistica(intento, origenId) as Route)
        return
      }
      if (guardado !== null) avisarExito('Embarque guardado.')
      alCerrar()
    },
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDelEmbarque>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios) as (keyof BorradorDelEmbarque)[]) {
        envio.quitarMotivo(CLAVE_EN_LA_BASE[clave])
      }
    },
  }
}
