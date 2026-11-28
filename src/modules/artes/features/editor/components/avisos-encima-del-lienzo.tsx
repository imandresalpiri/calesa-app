'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { useSalidaConCambios } from '@/shared/ui/use-salida-con-cambios'
import { MENSAJE_DEL_CONFLICTO_DE_ARTE } from '../../../entities/editor/guardado'
import { ENCIMA_DEL_LIENZO } from './rejilla'

export const MENSAJE_DEL_BORRADOR_OFRECIDO =
  'Tienes cambios sin guardar de antes de que otra persona guardara.'

const DETALLE_DEL_CONFLICTO =
  'No se guardó nada. Recargar trae su versión y lo tuyo queda para recuperarlo.'

type Props = {
  hayCambios: boolean
  conflicto: boolean
  ofrecido: boolean
  alRecuperar: () => void
  alDescartarOfrecido: () => void
  // Al salir con «Descartar»: el borrador local se olvida.
  alDescartarAlSalir: () => void
}

// Lo que se avisa encima del lienzo, arriba y al centro, sin cambiarle el tamaño, de a uno: salir con cambios («Descartar» o «Seguir
// editando», `useSalidaConCambios`), el conflicto al guardar (`PT409`, con «Recargar») y el borrador de antes de que otra persona guardara.
// Recargar trae la versión nueva: la página cambia su `key` y el editor se vuelve a montar con el borrador ofrecido.
export function AvisosEncimaDelLienzo(props: Props) {
  const { conflicto, ofrecido } = props
  const router = useRouter()
  const salida = useSalidaConCambios(props.hayCambios, props.alDescartarAlSalir)
  if (salida.pendiente) {
    return (
      <div className={ENCIMA_DEL_LIENZO}>
        <div className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 shadow-(--shadow-md)">
          <ConfirmarDescarte alSeguir={salida.seguir} alDescartar={salida.descartar} />
        </div>
      </div>
    )
  }
  if (conflicto) {
    return (
      <div className={ENCIMA_DEL_LIENZO}>
        <AvisoDeConflicto
          mensaje={MENSAJE_DEL_CONFLICTO_DE_ARTE}
          detalle={DETALLE_DEL_CONFLICTO}
          alRecargar={router.refresh}
        />
      </div>
    )
  }
  if (!ofrecido) {
    return null
  }
  return (
    <div className={ENCIMA_DEL_LIENZO}>
      <Aviso tono="aviso">
        <p className="font-medium">{MENSAJE_DEL_BORRADOR_OFRECIDO}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={props.alRecuperar}>
            Recuperarlos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={props.alDescartarOfrecido}>
            Descartar
          </Button>
        </div>
      </Aviso>
    </div>
  )
}
