'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeLogos,
  propias,
  textoDelTopeDeLogos,
  type ListaDeLogos as Lista,
} from '../../../entities/logos'
import { useFamiliaDeLogos } from '../hooks/use-familia-de-logos'
import { useLogos } from '../hooks/use-logos'
import { useFocoTrasMoverLogo } from '../hooks/use-foco-tras-mover-logo'
import { useModalDeLogo } from '../hooks/use-modal-de-logo'
import { useQuitarLogoPorUrl } from '../hooks/use-quitar-logo-por-url'
import { ModalDeLogoDiferido, QuitarLogoDiferido } from './diferidos'
import { FilasDeLogos } from './lista-de-logos'

const PREFIJO = 'logo'
const BOTON = 'h-11 md:h-8'

type Props = {
  lista: Lista
  // Abre el modal de Identidad (donde se cambian «Principal» y «Para fondo oscuro»).
  alCambiarEnIdentidad: () => void
}

// «Logos» en un modal (`?panel=logos`), desde la tarjeta de Empresa: «Subir un logo» arriba y la lista, con las dos fijas y las propias (arrastrar,
// «Mover antes», «Mover después», «Renombrar…», «Quitar…»). Hasta el tope que dice la base. Todo cambio lo hace la base por RPC con su versión y cada
// respuesta trae la lista entera. «Subir», «Renombrar» y «Quitar» son un modal hermano: el de la lista se cierra y, al cerrarse el otro, vuelve.
// A pantalla completa en el celular.
export function EditorDeLogos({ lista: inicial, alCambiarEnIdentidad }: Props) {
  const familia = useFamiliaDeLogos()
  const logos = useLogos(inicial)
  const { lista } = logos
  const modal = useModalDeLogo(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const quitar = useQuitarLogoPorUrl(lista)
  const montarQuitar = useAbiertoAlgunaVez(quitar.abierto)
  const alTope = alTopeDeLogos(lista)

  useFocoTrasMoverLogo(PREFIJO, logos.movimiento)

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Logos"
        descripcion="Las versiones del logo de la empresa: el principal, el de fondo oscuro y las que sumes (ícono, monocromo…). Las usan la ventana de cámara del Live y las artes."
        ancho="grande"
        completoEnCelular
        focoInicial={() => document.getElementById('logos-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <Button variant="ghost" className={BOTON} onClick={familia.cerrar}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            id="logos-nuevo"
            className={BOTON}
            disabled={alTope}
            aria-describedby={alTope ? 'logos-tope' : undefined}
            onClick={modal.abrirNuevo}
          >
            <PlusIcon aria-hidden />
            Subir un logo
          </Button>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            {propias(lista).length} de {lista.tope} logos propios.
          </p>
        </div>
        {alTope ? (
          <Aviso tono="aviso">
            <span id="logos-tope">{textoDelTopeDeLogos(lista.tope)}</span>
          </Aviso>
        ) : null}
        <FilasDeLogos
          logos={logos}
          prefijo={PREFIJO}
          alRenombrar={modal.abrirRenombre}
          alPedirQuitar={quitar.abrir}
          alCambiarEnIdentidad={alCambiarEnIdentidad}
        />
      </Modal>
      {montar ? (
        <ModalDeLogoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          logos={logos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarQuitar ? (
        <QuitarLogoDiferido
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          logo={quitar.logo}
          usos={logos.usos}
          enCurso={logos.enCurso}
          alQuitar={logos.quitar}
        />
      ) : null}
    </>
  )
}
