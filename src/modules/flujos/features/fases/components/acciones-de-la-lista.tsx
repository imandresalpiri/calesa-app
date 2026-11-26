'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { motivoParaNoAbrirNuevaFase } from '../../../entities/fases/panel-de-fase'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useEliminarFasePorUrl } from '../hooks/use-eliminar-fase-por-url'
import { useListaDeFases } from '../hooks/use-lista-de-fases'
import { useModalDeCopiarFases } from '../hooks/use-modal-de-copiar-fases'
import { useModalDeNuevaFase } from '../hooks/use-modal-de-nueva-fase'
import { useVistaDelFlujo } from '../../configuracion/hooks/use-vista-del-flujo'
import {
  ConfirmarEliminarFaseDiferido,
  ModalDeCopiarFasesDiferido,
  ModalDeNuevaFaseDiferido,
} from './diferidos'

type Props = { flujo: FlujoParaConfigurar }

const ID_DEL_MOTIVO = 'motivo-de-nueva-fase'

// El hueco `accionesDeLaLista` de la pantalla de flujos: «Nueva fase» a la derecha del título, y —una vez por pantalla— el modal que abre, el de
// «Empezar con las fases de…» y la confirmación de «Jubilar o eliminar», que se abren por la URL y se piden con `diferido()` la primera vez. Sin fases,
// «Nueva fase» no está en la barra: el vacío ofrece cómo empezar (`EmpezarElFlujo`). Sin permiso no hay nada que apagar: la página del flujo sólo se
// abre a quien lo configura (D1).
export function AccionesDeLaLista({ flujo }: Props) {
  const lista = useListaDeFases(flujo)
  const modal = useModalDeNuevaFase(flujo)
  const montarModal = useAbiertoAlgunaVez(modal.abierto)
  const quitar = useEliminarFasePorUrl(flujo)
  const montarQuitar = useAbiertoAlgunaVez(quitar.abierto)
  const copia = useModalDeCopiarFases(flujo)
  const montarCopia = useAbiertoAlgunaVez(copia.abierto)
  const motivo = motivoParaNoAbrirNuevaFase(flujo)
  const sinFases = flujo.fases.length === 0
  // En el diagrama, «Nueva fase» está en su barra flotante (y en el doble clic): aquí sólo en la lista. Los modales siguen montados aquí.
  const enLaLista = useVistaDelFlujo().vista === 'lista'

  return (
    <div className="grid justify-items-end gap-1">
      {sinFases || !enLaLista ? null : (
        <Button
          className="h-11 md:h-8"
          disabled={motivo !== null}
          aria-describedby={motivo === null ? undefined : ID_DEL_MOTIVO}
          onClick={modal.abrir}
        >
          <PlusIcon aria-hidden />
          Nueva fase
        </Button>
      )}
      {motivo === null || !enLaLista ? null : (
        <p id={ID_DEL_MOTIVO} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivo}
        </p>
      )}
      {montarModal ? (
        <ModalDeNuevaFaseDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          lista={lista}
          posicion={modal.posicion}
        />
      ) : null}
      {montarCopia ? (
        <ModalDeCopiarFasesDiferido
          key={copia.apertura}
          abierto={copia.abierto}
          alCerrar={copia.alCerrar}
          flujo={flujo}
        />
      ) : null}
      {montarQuitar ? (
        <ConfirmarEliminarFaseDiferido
          key={quitar.apertura}
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          fase={quitar.fase}
          lista={lista}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="fase-${quitar.fase?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}
