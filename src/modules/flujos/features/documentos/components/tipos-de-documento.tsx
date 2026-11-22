'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { VistasDeGrupos } from '../../../entities/documentos/vista-de-grupo'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { GrupoDeTipos } from './grupo-de-tipos'

type Props = {
  vistas: VistasDeGrupos
  // El flujo del panel, para nombrarlo («Sólo de Miami»); nulo si no hay.
  nombreDelFlujo: string | null
}

// Los tipos de documento de un grupo: los de toda la empresa (Logística › Configuración › Tipos de documento) o los del flujo (su panel). El grupo viene de la página
// (las escrituras no devuelven la lista: la página se vuelve a leer); el modal y la confirmación por la URL son los mismos para los dos.
export function TiposDeDocumento({ vistas, nombreDelFlujo }: Props) {
  const tipos = useTiposDeDocumento(vistas)
  const modal = useModalDeTipo(vistas)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(vistas)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const flujoId = modal.grupo === 'flujo' ? (vistas.flujo?.grupo.flujoId ?? null) : null
  const prefijoDelMas = eliminacion.tipo?.flujoId == null ? 'empresa' : 'flujo'

  return (
    <div className="grid gap-6">
      {vistas.empresa ? (
        <GrupoDeTipos
          clave="empresa"
          vista={vistas.empresa}
          titulo="De toda la empresa"
          detalle="Se piden en cualquier flujo que los use."
          vacio="No hay tipos de toda la empresa."
          tipos={tipos}
          alNuevo={modal.abrirNuevo}
          alEditar={modal.abrirEdicion}
          alPedirEliminar={eliminacion.abrir}
        />
      ) : null}
      {vistas.flujo ? (
        <GrupoDeTipos
          clave="flujo"
          vista={vistas.flujo}
          titulo="Sólo de este flujo"
          detalle={
            nombreDelFlujo
              ? `Sólo se piden en «${nombreDelFlujo}».`
              : 'Sólo se piden en el flujo elegido.'
          }
          vacio="Este flujo no tiene tipos propios. Crea el primero con «Nuevo tipo»."
          tipos={tipos}
          alNuevo={modal.abrirNuevo}
          alEditar={modal.abrirEdicion}
          alPedirEliminar={eliminacion.abrir}
        />
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {tipos.anuncio}
      </p>
      {montar && modal.grupo ? (
        <ModalDeTipoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          grupo={modal.grupo}
          flujoId={flujoId}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTipoDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tipo={eliminacion.tipo}
          enCurso={tipos.enCurso}
          alEliminar={tipos.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="tipo-de-documento-${prefijoDelMas}-${eliminacion.tipo?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}
