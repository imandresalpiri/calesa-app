'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type {
  CamposDeEnlace,
  Direccion,
  EnlaceDeAyudaDeLaEmpresa,
  ListaDeEnlacesDeLaEmpresa,
} from '../../../entities/enlaces-de-ayuda'
import { crearEnlaceDeAyuda } from '../actions/crear-enlace-de-ayuda'
import { guardarEnlaceDeAyuda } from '../actions/guardar-enlace-de-ayuda'
import { moverEnlaceDeAyuda } from '../actions/mover-enlace-de-ayuda'
import { quitarEnlaceDeAyuda } from '../actions/quitar-enlace-de-ayuda'

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

type Pedido = Parameters<typeof enviarAccion<ListaDeEnlacesDeLaEmpresa>>[0]

const comoEnvio = (pedido: Pedido) =>
  enviarAccion<ListaDeEnlacesDeLaEmpresa>(pedido, MENSAJE_DE_VALIDACION)

// Las cuatro Server Actions de los enlaces de la empresa, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al
// servidor). Cada una manda la versión que se tenía en pantalla.
export function usePedidosDeEnlaces() {
  const crear = useAction(crearEnlaceDeAyuda)
  const guardar = useAction(guardarEnlaceDeAyuda)
  const mover = useAction(moverEnlaceDeAyuda)
  const quitar = useAction(quitarEnlaceDeAyuda)
  return {
    crear: (id: string, campos: CamposDeEnlace) => comoEnvio(crear.executeAsync({ id, ...campos })),
    guardar: (
      enlace: EnlaceDeAyudaDeLaEmpresa,
      cambios: Partial<CamposDeEnlace> & { activo?: boolean },
    ) =>
      comoEnvio(
        guardar.executeAsync({
          id: enlace.id,
          actualizadoEnEsperado: enlace.actualizadoEn,
          ...cambios,
        }),
      ),
    mover: (enlace: EnlaceDeAyudaDeLaEmpresa, direccion: Direccion) =>
      comoEnvio(
        mover.executeAsync({
          id: enlace.id,
          actualizadoEnEsperado: enlace.actualizadoEn,
          direccion,
        }),
      ),
    quitar: (enlace: EnlaceDeAyudaDeLaEmpresa) =>
      comoEnvio(
        quitar.executeAsync({ id: enlace.id, actualizadoEnEsperado: enlace.actualizadoEn }),
      ),
  }
}
