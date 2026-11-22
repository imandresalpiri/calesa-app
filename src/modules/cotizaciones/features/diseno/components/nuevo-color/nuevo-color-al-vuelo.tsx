'use client'

import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { colorCreadoDe } from '../../../../entities/diseno/color-creado'
import { TOPE_DE_TONOS } from '../../../../entities/diseno/tonos'
import type { PropsDelNuevoColor } from '../../../../entities/nuevo-color'
import type { ColoresParaCrear } from '../../hooks/use-formulario-de-color'
import { usePedidosDeColores } from '../../hooks/use-pedidos-de-colores'
import { ModalDeColor } from '../modal-de-color'

// «Nuevo color» al vuelo (glosario), el hueco `NuevoColor` del panel de una banda: el mismo modal de la sección de colores (nombre, color y cómo se ve), que crea
// el color en el catálogo con `tono_crear()` (`crearTonoAlVuelo`: sin revalidar la página) y le da a quien lo abrió el color creado, para que lo elija. No relee
// el catálogo: la respuesta trae la lista entera y de ahí sale el color (`colorCreadoDe`, por el id del intento). El tope, el nombre repetido y la falta de red se dicen como en la sección de colores. Quien lo
// monta le da una `key` por apertura: cada una empieza de cero, con un id de intento nuevo.
export function NuevoColorAlVuelo({
  abierto,
  alCerrar,
  existentes,
  tope,
  alCrear,
  focoAlCerrar,
}: PropsDelNuevoColor) {
  const pedir = usePedidosDeColores()
  const unaVez = useUnEnvioALaVez()
  const colores: ColoresParaCrear = {
    lista: { tonos: existentes, tope: tope ?? TOPE_DE_TONOS },
    enCurso: unaVez.enCurso,
    crear: (id, nombre, hex) =>
      unaVez.mandar(async () => {
        const envio = await pedir.crearAlVuelo(id, nombre, hex)
        const creado = envio.ok ? colorCreadoDe(envio.data.lista, id) : null
        if (creado !== null) alCrear(creado)
        return envio
      }),
  }
  return (
    <ModalDeColor
      abierto={abierto}
      alCerrar={alCerrar}
      colores={colores}
      original={null}
      noDisponible={null}
      focoAlCerrar={focoAlCerrar ?? (() => true)}
    />
  )
}
