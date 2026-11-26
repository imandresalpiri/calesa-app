'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { PlusIcon } from 'lucide-react'
import {
  alTopeDeLaEmpresa,
  textoDelTopeDeLaEmpresa,
  type ListaDeEnlacesDeLaEmpresa,
} from '../../../entities/enlaces-de-ayuda'
import { PANELES_DE_LA_EMPRESA } from '../../../entities/paneles-de-enlaces-de-ayuda'
import { useEnlacesDeAyuda } from '../hooks/use-enlaces-de-ayuda'
import { useFamiliaDeEnlaces } from '../hooks/use-familia-de-enlaces'
import { useModalDeEnlace } from '../hooks/use-modal-de-enlace'
import { useQuitarEnlacePorUrl } from '../hooks/use-quitar-enlace-por-url'
import { ModalDeEnlaceDeLaEmpresaDiferido, QuitarEnlaceDeAyudaDiferido } from './diferidos'
import { CatalogoDeEnlaces } from './catalogo-de-enlaces'

const PREFIJO = 'enlace-de-ayuda'
const BOTON = 'h-11 md:h-8'

// «Enlaces de ayuda» en un modal (`?panel=enlaces-de-ayuda`), desde la tarjeta de Empresa: «Nuevo enlace» arriba y la lista, cada fila con su
// «⋯» (Editar, Subir, Bajar, Desactivar o Activar, Quitar). Hasta el tope que dice la base. Todo cambio lo hace la base por RPC con su versión
// y cada respuesta trae la lista entera. «Nuevo», «Editar» y «Quitar» son un modal hermano: el de la lista se cierra y, al cerrarse el otro,
// vuelve. A pantalla completa en el celular.
export function EditorDeEnlacesDeAyuda({ lista: inicial }: { lista: ListaDeEnlacesDeLaEmpresa }) {
  const familia = useFamiliaDeEnlaces(PANELES_DE_LA_EMPRESA)
  const enlaces = useEnlacesDeAyuda(inicial)
  const { lista } = enlaces
  const modal = useModalDeEnlace(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const quitar = useQuitarEnlacePorUrl(lista.enlaces)
  const montarQuitar = useAbiertoAlgunaVez(quitar.abierto)
  const alTope = alTopeDeLaEmpresa(lista)
  useFocoTrasMover(PREFIJO, enlaces.movimiento)

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Enlaces de ayuda"
        descripcion="Los ve todo el equipo en «Ayuda», desde el menú del perfil, en este orden. Cada persona puede ocultarlos u ordenarlos para sí."
        ancho="grande"
        completoEnCelular
        focoInicial={() => document.getElementById('enlaces-de-ayuda-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <Button variant="ghost" className={BOTON} onClick={familia.cerrar}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            id="enlaces-de-ayuda-nuevo"
            className={BOTON}
            disabled={alTope}
            aria-describedby={alTope ? 'enlaces-de-ayuda-tope' : undefined}
            onClick={modal.abrirNuevo}
          >
            <PlusIcon aria-hidden />
            Nuevo enlace
          </Button>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            {lista.enlaces.length} de {lista.tope} enlaces posibles.
          </p>
        </div>
        {alTope ? (
          <Aviso tono="aviso">
            <span id="enlaces-de-ayuda-tope">{textoDelTopeDeLaEmpresa(lista.tope)}</span>
          </Aviso>
        ) : null}
        <CatalogoDeEnlaces
          enlaces={enlaces}
          prefijo={PREFIJO}
          alEditar={modal.abrirEdicion}
          alPedirQuitar={quitar.abrir}
        />
      </Modal>
      {montar ? (
        <ModalDeEnlaceDeLaEmpresaDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          enlaces={enlaces}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarQuitar ? (
        <QuitarEnlaceDeAyudaDiferido
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          enlace={quitar.enlace}
          enCurso={enlaces.enCurso}
          alQuitar={enlaces.quitar}
        />
      ) : null}
    </>
  )
}
