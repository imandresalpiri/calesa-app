'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { cuantosPropios, type MisEnlacesLeidos } from '../../../entities/mis-enlaces-de-ayuda'
import {
  PANELES_DEL_PERFIL,
  textoDelTopeDePropios,
} from '../../../entities/paneles-de-enlaces-de-ayuda'
import { useFamiliaDeEnlaces } from '../../enlaces-de-ayuda/hooks/use-familia-de-enlaces'
import { useMisEnlacesDeAyuda } from '../hooks/use-mis-enlaces-de-ayuda'
import { useModalDePropio } from '../hooks/use-modal-de-propio'
import { ModalDeEnlacePropioDiferido } from './diferidos'
import { ListaDeMisEnlaces } from './lista-de-mis-enlaces'

const PREFIJO = 'mi-enlace'
const BOTON = 'h-11 md:h-8'

// «Ayuda» de Perfil en un modal (`?panel=enlaces-de-ayuda`): los de la empresa, cada uno con «Mostrar», y los propios, en el orden de quien
// mira (Subir y Bajar en el «⋯»). «Agregar enlace propio» arriba, hasta el tope. Cada cambio guarda al instante. A pantalla completa en el
// celular. «Agregar» y «Editar» de uno propio son un modal hermano: éste se cierra y vuelve al cerrarse aquél.
export function EditorDeMisEnlaces({ leidos }: { leidos: MisEnlacesLeidos }) {
  const familia = useFamiliaDeEnlaces(PANELES_DEL_PERFIL)
  const misEnlaces = useMisEnlacesDeAyuda(leidos)
  const { elementos, topePropios } = misEnlaces
  const modal = useModalDePropio(elementos, topePropios)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const propios = cuantosPropios(elementos)
  const alTope = propios >= topePropios
  useFocoTrasMover(PREFIJO, misEnlaces.movimiento)

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Mis enlaces de ayuda"
        descripcion="Elige cuáles ves en «Ayuda», desde el menú del perfil, y en qué orden. Los propios sólo los ves tú."
        ancho="amplio"
        completoEnCelular
        focoInicial={() => document.getElementById('mis-enlaces-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <Button variant="ghost" className={BOTON} onClick={familia.cerrar}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            id="mis-enlaces-nuevo"
            className={BOTON}
            disabled={alTope}
            aria-describedby={alTope ? 'mis-enlaces-tope' : undefined}
            onClick={modal.abrirNuevo}
          >
            <PlusIcon aria-hidden />
            Agregar enlace propio
          </Button>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            {propios} de {topePropios} propios.
          </p>
        </div>
        {alTope ? (
          <Aviso tono="aviso">
            <span id="mis-enlaces-tope">{textoDelTopeDePropios(topePropios)}</span>
          </Aviso>
        ) : null}
        <ListaDeMisEnlaces
          misEnlaces={misEnlaces}
          prefijo={PREFIJO}
          alEditar={modal.abrirEdicion}
        />
      </Modal>
      {montar ? (
        <ModalDeEnlacePropioDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          misEnlaces={misEnlaces}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
    </>
  )
}
