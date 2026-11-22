'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, enfocarPrimerError, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import type { ConfiguracionEnLaRueda } from '../../../../entities/cola/rueda'
import { configurarEnLaRueda } from '../actions/configurar-en-la-rueda'
import { useAvisoDeLaRueda } from './use-aviso-de-la-rueda'

type Opciones = {
  // Quien mira puede abrir Roles: el aviso del rol lleva el enlace.
  puedeVerRoles: boolean
  alGuardar: () => void
}

export type ErroresDeLaRueda = Partial<Record<'maxAbiertas' | 'prioridad' | 'orden', string>>

// Guardar a alguien en la rueda. Si algo falla, lo escrito queda y el foco va al primer campo con error. Con `ok`, el panel se cierra (la página se relee
// por la revalidación) y, si su rol no recibe turnos, lo avisa con «Abrir Roles» (8-1).
export function useAgregarALaRueda({ puedeVerRoles, alGuardar }: Opciones) {
  const { executeAsync, result, isPending } = useAction(configurarEnLaRueda)
  const avisarGuardado = useAvisoDeLaRueda(puedeVerRoles)

  async function guardar(
    configuracion: ConfiguracionEnLaRueda,
    nombre: string,
    formulario: HTMLFormElement | null,
  ): Promise<void> {
    const resultado = resultadoDeAccion(await conRed(executeAsync(configuracion)))
    if (!resultado.ok) {
      // Un error de validación ya está escrito al lado de su campo.
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(formulario)
      return
    }
    alGuardar()
    avisarGuardado(resultado.data.enLaRueda, nombre)
  }

  const campos = result.validationErrors?.fieldErrors ?? {}
  const errores: ErroresDeLaRueda = {
    maxAbiertas: campos.maxAbiertas?.[0],
    prioridad: campos.prioridad?.[0],
    orden: campos.orden?.[0],
  }
  return { guardar, enCurso: isPending, errores }
}
