'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { useEliminarNivelPorUrl } from '../hooks/use-eliminar-nivel-por-url'
import type { useModalDeNivel } from '../hooks/use-modal-de-nivel'
import { idDelMasDeNivel } from '../hooks/use-menus-de-niveles'
import type { Niveles } from '../hooks/use-niveles'
import { EliminarNivelDiferido, ModalDeNivelDiferido } from './diferidos'

type Props = {
  niveles: Niveles
  modal: ReturnType<typeof useModalDeNivel>
  eliminacion: ReturnType<typeof useEliminarNivelPorUrl>
}

// El modal de «Nuevo nivel» y «Renombrar», la confirmación de eliminar y lo que anuncia el lector de pantalla tras retirar o restaurar. Los dos
// modales se piden al abrirse.
export function VentanasDeNiveles({ niveles, modal, eliminacion }: Props) {
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  return (
    <>
      {montar ? (
        <ModalDeNivelDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          niveles={niveles}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarNivelDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          nivel={eliminacion.nivel}
          enCurso={niveles.enCurso}
          alEliminar={niveles.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${idDelMasDeNivel(eliminacion.nivel?.id ?? '')}"]`,
            ) ?? true
          }
        />
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {niveles.anuncio}
      </p>
    </>
  )
}
