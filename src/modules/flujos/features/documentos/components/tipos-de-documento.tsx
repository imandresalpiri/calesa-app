'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS,
  TITULO_DE_LOS_COMPARTIDOS,
  grupoDelTipo,
  textoDelGrupoVacio,
  textoSinTipos,
  tituloDeLosPropios,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'
import { useTipoCreado } from '../../configuracion/hooks/use-tipo-creado'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { GrupoDeTipos } from './grupo-de-tipos'

type Props = {
  vistas: VistasDeGrupos
  // El origen del flujo, para nombrar su grupo («De Miami»); nulo: el flujo de repuestos.
  origen: string | null
  // Si quien mira puede crear en alguno de los dos grupos.
  puedeCrear: boolean
}

const BOTON = 'h-11 md:h-8'
const ID_DEL_MOTIVO = 'tipos-de-documento-motivo'

// El drawer «Tipos de documento» (`?panel=tipos-de-documento`): un solo «Nuevo tipo de documento» arriba (abre el modal que monta el editor del flujo:
// «Para» elige el grupo) y los dos grupos a la vista, los del flujo («De Miami») y los compartidos, con los que ese flujo tapa. Los grupos vienen de la
// página (las escrituras no devuelven la lista: la página se vuelve a leer); «Editar» y la confirmación de eliminar van en `?accion=`.
export function TiposDeDocumento({ vistas, origen, puedeCrear }: Props) {
  const tipos = useTiposDeDocumento(vistas)
  const modal = useModalDeTipo(vistas)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(vistas)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const { abrirNuevo } = useTipoCreado()
  const prefijoDelMas = eliminacion.tipo ? grupoDelTipo(eliminacion.tipo) : 'origen'
  const vacio = vistas.origen.grupo.tipos.length === 0 && vistas.compartido.grupo.tipos.length === 0
  const comunes = {
    tipos,
    alEditar: modal.abrirEdicion,
    alPedirEliminar: eliminacion.abrir,
  }

  return (
    <div className="grid gap-6">
      <NuevoTipoArriba puedeCrear={puedeCrear} alCrear={abrirNuevo} />
      {vacio ? (
        <p className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-(--color-ink-soft)">
          {textoSinTipos(origen)}
        </p>
      ) : (
        <>
          <GrupoDeTipos
            clave="origen"
            vista={vistas.origen}
            titulo={tituloDeLosPropios(origen)}
            vacio={textoDelGrupoVacio('origen', origen)}
            {...comunes}
          />
          <GrupoDeTipos
            clave="compartido"
            vista={vistas.compartido}
            titulo={TITULO_DE_LOS_COMPARTIDOS}
            vacio={textoDelGrupoVacio('compartido', origen)}
            {...comunes}
          />
        </>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {tipos.anuncio}
      </p>
      {montar ? (
        <ModalDeTipoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          creacion={null}
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

// Arriba de los grupos: un solo «Nuevo tipo de documento» y, si quien mira no puede crear en ninguno, el motivo.
function NuevoTipoArriba({ puedeCrear, alCrear }: { puedeCrear: boolean; alCrear: () => void }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className={BOTON}
          disabled={!puedeCrear}
          aria-describedby={puedeCrear ? undefined : ID_DEL_MOTIVO}
          onClick={() => {
            alCrear()
          }}
        >
          <PlusIcon aria-hidden />
          Nuevo tipo de documento
        </Button>
      </div>
      {puedeCrear ? null : (
        <Aviso tono="info">
          <span id={ID_DEL_MOTIVO}>{MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS}</span>
        </Aviso>
      )}
    </div>
  )
}
