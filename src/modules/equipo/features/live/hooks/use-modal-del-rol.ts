'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { CampoDelLive } from '../../../entities/live'
import { combinarAjustesDelLive } from '../../../entities/live-combinar'
import type { AjustesDeUnRol, OrigenDelLive } from '../../../entities/live-configuracion'
import { formularioDelRol, mismosAjustes } from '../../../entities/live-formulario'
import { guardarRolDelLive } from '../actions/guardar-rol'
import { useFormularioDelLive } from './use-formulario-del-live'

const MENSAJE_DE_VALIDACION = 'Revisa los ajustes marcados.'

type Opciones = {
  rol: AjustesDeUnRol
  origenes: readonly OrigenDelLive[]
  abierto: boolean
  alCerrar: () => void
}

// El modal de un rol (`?panel=rol&rol=<id>`): empieza de lo guardado combinado con lo por defecto y guarda todo lo que se ve, con la versión de la
// fila (nula si el rol estaba «Por defecto»). Sin cambios, guardar cierra; un conflicto ofrece «Recargar» y lo elegido queda.
export function useModalDelRol({ rol, origenes, abierto, alCerrar }: Opciones) {
  const campos = useFormularioDelLive(() => formularioDelRol(rol.ajustes), {
    heredado: 'todos',
    activos: origenes.filter((o) => o.activo).map((o) => o.id),
  })
  const { lectura } = campos
  const guardado = combinarAjustesDelLive({ rol: rol.ajustes, persona: null }).ajustes
  const elegido = lectura.ok
    ? combinarAjustesDelLive({ rol: lectura.ajustes, persona: null }).ajustes
    : null
  const hayCambios = elegido === null || !mismosAjustes(guardado, elegido)
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: rol.actualizadoEn,
    validar: () => (lectura.ok ? null : { [lectura.campo]: lectura.motivo }),
    pedir: async () => {
      if (elegido === null || !hayCambios) {
        return { ok: true, data: { actualizadoEn: rol.actualizadoEn ?? '' } }
      }
      return enviarAccion(
        guardarRolDelLive({
          rolId: rol.rol.id,
          // El esquema de la action pide un arreglo propio: se copia el de lo elegido.
          ajustes: {
            ...elegido,
            origenes: elegido.origenes === 'todos' ? 'todos' : [...elegido.origenes],
          },
          actualizadoEnEsperado: rol.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito(`Se guardó el Modo Live de «${rol.rol.nombre}».`)
      alCerrar()
    },
  })
  return {
    ...campos,
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
