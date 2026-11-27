'use client'

import { useAction } from 'next-safe-action/hooks'
import { resultadoDeAccion } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  textoDeDatosNuevos,
  type DatoNuevoDeApibara,
} from '../../../entities/datos-nuevos-de-apibara'
import { agregarDatosDeApibara } from '../actions/agregar-datos-de-apibara'

type Props = {
  origenId: string
  datos: readonly DatoNuevoDeApibara[]
}

// «apibara trae N datos que este origen no usa»: lo que la API sumó después de que el origen nació.
// Nada se pierde (está en la respuesta guardada de cada vehículo); agregarlos los vuelve campos. «Ver cuáles» abre la lista en un modal con su URL
// (`?panel=datos-nuevos-de-apibara`).
export function DatosNuevosDeApibara({ origenId, datos }: Props) {
  const { executeAsync, isPending } = useAction(agregarDatosDeApibara)
  const panel = usePanelPorUrl('datos-nuevos-de-apibara')

  async function agregar() {
    try {
      const resultado = resultadoDeAccion(
        await executeAsync({ origenId, rutas: datos.map((dato) => dato.ruta) }),
      )
      if (resultado.ok) {
        const { agregados } = resultado.data
        avisarExito(
          agregados === 1
            ? 'Se agregó 1 campo nuevo.'
            : `Se agregaron ${String(agregados)} campos nuevos.`,
        )
      } else {
        avisarError(resultado.error)
      }
    } catch {
      avisarError({
        codigo: 'inesperado',
        mensaje: 'No pudimos llegar al servidor. Revisa tu conexión y vuelve a intentar.',
      })
    }
  }

  return (
    <Aviso tono="info">
      <div className="grid gap-2">
        <p>{textoDeDatosNuevos(datos.length)}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            aria-haspopup="dialog"
            className="h-11 md:h-8"
            onClick={() => {
              panel.abrir()
            }}
          >
            Ver cuáles
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            disabled={isPending}
            onClick={() => void agregar()}
          >
            {isPending ? 'Agregando…' : 'Agregarlos'}
          </Button>
        </div>
      </div>
      <Modal
        abierto={panel.abierto}
        alCerrar={panel.cerrar}
        titulo="Datos nuevos de apibara"
        descripcion={textoDeDatosNuevos(datos.length)}
        ancho="amplio"
      >
        <ul className="grid gap-1 text-(length:--text-sm)">
          {datos.map((dato) => (
            <li key={dato.ruta} className="min-w-0 break-words">
              <code>{dato.ruta}</code>
              {dato.ejemplo ? ` · por ejemplo ${dato.ejemplo}` : ''}
            </li>
          ))}
        </ul>
      </Modal>
    </Aviso>
  )
}
