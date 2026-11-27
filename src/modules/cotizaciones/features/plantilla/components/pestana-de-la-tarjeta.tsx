'use client'

import { useMemo, useState, useSyncExternalStore, type ComponentType } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { lecturaEnCuadricula } from '../../../entities/plantilla/lectura-en-cuadricula'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { ReferenciaDeLaTarjeta } from '../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { useLugarPedido } from '../hooks/use-lugar-pedido'
import { usePanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { useReferenciaDelLienzo } from '../hooks/use-referencia-del-lienzo'
import { AccionesDeLaPlantilla } from './acciones-de-la-plantilla'
import { AvisoDePantallaChica, EditorDeLaCuadriculaDiferido } from './cuadricula'

type Props = {
  editor: PropsDelEditor
  referencia: ReferenciaDeLaTarjeta
  // El hueco del lienzo: lo pasa la página (el área `tarjeta` lo llena).
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  // `empresa.ajustes.gestionar` de quien mira: el aviso del logo que no se dibuja abre Empresa.
  puedeCambiarElLogo: boolean
}

// El editor se usa en una pantalla de al menos 1.024 px; por debajo, el aviso y la tarjeta en sólo lectura (y el código del editor no se pide).
export const ANCHO_DEL_EDITOR = '(min-width: 1024px)'

const SIN_SUSCRIPCION = () => () => {}

// La `key` del editor: cambia con una versión del borrador que no es la que el editor acaba de guardar (la de otra persona tras «Recargar», o ninguna tras publicar o
// descartar), y no con la propia: guardar no remonta el editor y el historial de deshacer sigue (LECCIONES › Interfaz).
function useClaveDelEditor(origen: string, esperada: string | null) {
  const armar = (e: string | null) => `${origen}:${e ?? 'sin'}`
  const [clave, setClave] = useState(() => armar(esperada))
  const [vista, setVista] = useState(esperada)
  const [propia, setPropia] = useState<string | null>(null)
  if (esperada !== vista) {
    setVista(esperada)
    if (esperada === null || esperada !== propia) setClave(armar(esperada))
  }
  return { clave, guardada: setPropia }
}

// El editor de la tarjeta con sus modales. El editor se remonta con una versión que no es la propia (`useClaveDelEditor`); los modales **no**: viven aquí, fuera de
// esa `key`, para que «Recargar» tras un PT409 no los remonte y se conserve la nota escrita. Un rechazo de publicar con su `donde` («Ir a la celda») llega al editor
// por `irA`. Antes de hidratar no se sabe el ancho: el esqueleto.
export function PestanaDeLaTarjeta({ editor, referencia, Lienzo, puedeCambiarElLogo }: Props) {
  const panel = usePanelDeLaTarjeta()
  const ancha = useConsultaDeMedios(ANCHO_DEL_EDITOR)
  const hidratada = useSyncExternalStore(
    SIN_SUSCRIPCION,
    () => true,
    () => false,
  )
  // El primer `irA` puede venir de la URL (`?lugar=`, el «Ir a la celda» del rechazo de «Activar»).
  const lugarPedido = useLugarPedido()
  const [irA, setIrA] = useState<{ donde: string; vez: number } | null>(() =>
    lugarPedido === null ? null : { donde: lugarPedido, vez: 1 },
  )
  const clave = useClaveDelEditor(
    `${editor.origen.id}:${editor.formulaDelOrigenId}`,
    editor.esperada,
  )
  const { ejemplo, elegir } = useReferenciaDelLienzo()
  const lectura = useMemo(
    () => lecturaEnCuadricula(editor.inicial, editor.contexto, editor.tonos),
    [editor.inicial, editor.contexto, editor.tonos],
  )
  const acciones = (
    <AccionesDeLaPlantilla
      panel={panel}
      origen={editor.origen}
      formulaDelOrigenId={editor.formulaDelOrigenId}
      esperada={editor.esperada}
      informacion={editor}
      alIrA={(donde) => {
        setIrA((antes) => ({ donde, vez: (antes?.vez ?? 0) + 1 }))
      }}
    />
  )
  if (!hidratada) return <Skeleton className="h-96 w-full rounded-(--radius-card)" />
  if (!ancha) {
    return (
      <>
        <AvisoDePantallaChica
          lectura={lectura}
          referencia={referencia}
          ejemplo={ejemplo}
          Lienzo={Lienzo}
        />
        {acciones}
      </>
    )
  }
  return (
    <>
      <EditorDeLaCuadriculaDiferido
        key={clave.clave}
        {...editor}
        panel={panel}
        referencia={referencia}
        ejemplo={ejemplo}
        alElegirReferencia={elegir}
        Lienzo={Lienzo}
        irA={irA}
        alGuardar={clave.guardada}
        alPublicar={panel.abrirPublicar}
        alDescartar={panel.abrirDescartar}
        puedeCambiarElLogo={puedeCambiarElLogo}
      />
      {acciones}
    </>
  )
}
