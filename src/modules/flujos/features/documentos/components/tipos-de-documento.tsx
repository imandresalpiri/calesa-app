'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  TITULO_DE_LOS_COMPARTIDOS,
  detalleDeLosPropios,
  tituloDeLosPropios,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { GrupoDeTipos } from './grupo-de-tipos'

type Props = {
  vistas: VistasDeGrupos
  // El origen del flujo del panel, para nombrar su grupo («De Miami»); nulo: el flujo de repuestos, o ningún flujo.
  origen: string | null
}

// Los tipos de documento: los compartidos (Logística › Configuración › Tipos de documento) o, en el panel del flujo, los suyos y debajo los compartidos, con
// los que ese flujo tapa. Los grupos vienen de la página (las escrituras no devuelven la lista: la página se vuelve a leer); el modal y la confirmación por
// la URL son los mismos para los dos.
export function TiposDeDocumento({ vistas, origen }: Props) {
  const tipos = useTiposDeDocumento(vistas)
  const modal = useModalDeTipo(vistas)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(vistas)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const flujoId = modal.grupo === 'flujo' ? (vistas.flujo?.grupo.flujoId ?? null) : null
  const prefijoDelMas = eliminacion.tipo?.flujoId == null ? 'empresa' : 'flujo'

  return (
    <div className="grid gap-6">
      {vistas.flujo ? (
        <GrupoDeTipos
          clave="flujo"
          vista={vistas.flujo}
          titulo={tituloDeLosPropios(origen)}
          detalle={detalleDeLosPropios(origen)}
          sinTitulo={false}
          vacio="Este flujo no tiene tipos propios. Crea el primero con «Nuevo tipo»."
          tipos={tipos}
          alNuevo={modal.abrirNuevo}
          alEditar={modal.abrirEdicion}
          alPedirEliminar={eliminacion.abrir}
        />
      ) : null}
      {vistas.empresa ? (
        <GrupoDeTipos
          clave="empresa"
          vista={vistas.empresa}
          titulo={TITULO_DE_LOS_COMPARTIDOS}
          detalle="Se piden en cualquier flujo que los use y no los tape con uno propio."
          sinTitulo={vistas.flujo === null}
          vacio="No hay tipos compartidos."
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
