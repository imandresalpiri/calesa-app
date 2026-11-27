'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { CampoDelLive } from '../../../entities/live'
import { combinarAjustesDelLive } from '../../../entities/live-combinar'
import type { OrigenDelLive, PersonaDelLive } from '../../../entities/live-configuracion'
import { formularioDeLaPersona, mismosAjustes } from '../../../entities/live-formulario'
import { guardarPersonaDelLive } from '../actions/guardar-persona'
import { useFormularioDelLive } from './use-formulario-del-live'

const MENSAJE_DE_VALIDACION = 'Revisa los ajustes marcados.'

type Opciones = {
  persona: PersonaDelLive
  origenes: readonly OrigenDelLive[]
  abierto: boolean
  alCerrar: () => void
}

// El modal de una persona (`?panel=persona&persona=<id>`): cada campo empieza en lo propio o en «Como su rol (…)», y se guarda sólo lo que pisa
// (todo en «Como su rol» quita lo propio). Con la versión de su fila; un conflicto ofrece «Recargar» y lo elegido queda.
export function useModalDeLaPersona({ persona, origenes, abierto, alCerrar }: Opciones) {
  const delRol = combinarAjustesDelLive({
    rol: persona.rol?.ajustes ?? null,
    persona: null,
  }).ajustes
  const campos = useFormularioDelLive(() => formularioDeLaPersona(persona.ajustes), {
    heredado: delRol.origenes,
    activos: origenes.filter((o) => o.activo).map((o) => o.id),
  })
  const { lectura } = campos
  const hayCambios = !lectura.ok || !mismosAjustes(persona.ajustes ?? {}, lectura.ajustes)
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: persona.actualizadoEn,
    validar: () => (lectura.ok ? null : { [lectura.campo]: lectura.motivo }),
    pedir: async () => {
      if (!lectura.ok || !hayCambios) {
        return { ok: true, data: { actualizadoEn: persona.actualizadoEn } }
      }
      // El esquema de la action pide un arreglo propio: se copia el de lo elegido.
      const { origenes, ...resto } = lectura.ajustes
      return enviarAccion(
        guardarPersonaDelLive({
          usuarioId: persona.id,
          ajustes:
            origenes === undefined
              ? resto
              : { ...resto, origenes: origenes === 'todos' ? 'todos' : [...origenes] },
          actualizadoEnEsperado: persona.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito(`Se guardó el Modo Live de «${persona.nombre}».`)
      alCerrar()
    },
  })
  return {
    ...campos,
    heredado: { origenes: delRol.origenes },
    elegir: (campo: CampoDelLive, opcion: string) => {
      campos.elegir(campo, opcion)
      formulario.quitarMotivo(campo)
    },
    marcarOrigen: (id: string, marcado: boolean) => {
      campos.marcarOrigen(id, marcado)
      formulario.quitarMotivo('origenes')
    },
    formulario,
  }
}
