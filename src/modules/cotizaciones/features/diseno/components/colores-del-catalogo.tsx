'use client'

import { PlusIcon, SwatchBookIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { alTopeDeTonos, textoDelTopeDeTonos } from '../../../entities/diseno/panel-de-tonos'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'
import { useColores, type Colores } from '../hooks/use-colores'
import { useEliminarColorPorUrl } from '../hooks/use-eliminar-color-por-url'
import { useFamiliaDeColores } from '../hooks/use-familia-de-colores'
import { useModalDeColor } from '../hooks/use-modal-de-color'
import { EliminarColorDiferido, ModalDeColorDiferido } from './diferidos'
import { FilaDeColor, idDelMenuDeColor } from './fila-de-color'

type Props = { lista: ListaDeTonos }

const BOTON = 'h-11 md:h-8'
const ID_DE_NUEVO = 'colores-nuevo'

function NuevoColor({ alNuevo, alTope }: { alNuevo: () => void; alTope: boolean }) {
  return (
    <Button
      id={ID_DE_NUEVO}
      className={BOTON}
      disabled={alTope}
      aria-describedby={alTope ? 'colores-tope' : undefined}
      onClick={alNuevo}
    >
      <PlusIcon aria-hidden />
      Nuevo color
    </Button>
  )
}

// El modal de «Nuevo color» y «Editar» y la confirmación de eliminar: se piden al abrirse.
function Ventanas({
  colores,
  modal,
  eliminacion,
  enLaFamilia,
}: {
  enLaFamilia: boolean
  colores: Colores
  modal: ReturnType<typeof useModalDeColor>
  eliminacion: ReturnType<typeof useEliminarColorPorUrl>
}) {
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  return (
    <>
      {montar ? (
        <ModalDeColorDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          colores={colores}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarColorDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tono={eliminacion.tono}
          enCurso={colores.enCurso}
          alEliminar={colores.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${idDelMenuDeColor(eliminacion.tono?.id ?? '')}"]`,
            ) ?? !enLaFamilia
          }
        />
      ) : null}
    </>
  )
}

// Los colores de la empresa en un modal (`?panel=colores`), desde la tarjeta «Colores» de Configuración › Orígenes (la tabla `tonos`): por nombre y hasta el tope que dice
// la base. Son de toda la empresa, no de un origen, y se guardan al instante (cada color es una escritura propia). Cada escritura devuelve la lista entera y esa
// reemplaza a la local: ningún pedido extra. «Nuevo color» arriba; cada fila, sólo con su «⋯». «Nuevo», «Editar» y «Eliminar» son un modal hermano, no uno encima: el de la
// lista se cierra y, al cerrarse el del color, vuelve. Al pasar al modal de un color el de la lista no devuelve el foco; al cerrarlo del todo, sí.
export function ColoresDelCatalogo({ lista: inicial }: Props) {
  const familia = useFamiliaDeColores()
  const colores = useColores(inicial)
  const { lista } = colores
  const modal = useModalDeColor(lista)
  const eliminacion = useEliminarColorPorUrl(lista.tonos)
  const alTope = alTopeDeTonos(lista)
  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Colores"
        ancho="grande"
        focoInicial={() => document.getElementById(ID_DE_NUEVO)}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <Button variant="ghost" className={BOTON} onClick={familia.cerrar}>
            Cerrar
          </Button>
        }
      >
        <div className="flex justify-end">
          <NuevoColor alNuevo={modal.abrirNuevo} alTope={alTope} />
        </div>
        {alTope ? (
          <Aviso tono="aviso">
            <span id="colores-tope">{textoDelTopeDeTonos(lista.tope)}</span>
          </Aviso>
        ) : null}
        {lista.tonos.length === 0 ? (
          <EstadoVacio
            Icono={SwatchBookIcon}
            titulo="Todavía no hay colores. Crea el primero."
            compacto
          />
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {lista.tonos.map((tono) => (
              <FilaDeColor
                key={tono.id}
                tono={tono}
                alEditar={modal.abrirEdicion}
                alPedirEliminar={eliminacion.abrir}
              />
            ))}
          </ul>
        )}
      </Modal>
      <Ventanas
        colores={colores}
        modal={modal}
        eliminacion={eliminacion}
        enLaFamilia={familia.enLaFamilia}
      />
    </>
  )
}
