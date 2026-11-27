'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { TablaDelCatalogoDelOrigen } from '../../../entities/catalogo-de-tablas'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import {
  mismaVersionDelEditor,
  pideOtroEditor,
  type VersionDelEditor,
} from '../../../entities/diseno/version-del-editor'
import type { ListaDeNiveles } from '../../../entities/nivel'
import { SOLO_LECTURA_EN_EL_LIVE } from '../../../entities/solo-lectura-en-el-live'
import { NuevoNivelAlVuelo } from '../../niveles/components/nuevo-nivel-al-vuelo'
import type { TonoDelCatalogo } from './aspecto'
import { useCreadosAlVuelo } from '../hooks/use-creados-al-vuelo'
import { useVistaDelEditor } from '../hooks/use-vista-del-editor'
import { EditorDeLaHoja } from './editor/editor-de-la-hoja'
import { HojaSoloLectura } from './editor/hoja-solo-lectura'
import type { ApoyoDelInspector } from './inspector/apoyo-del-inspector'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  // La fórmula del origen que se edita: va en la `key` del editor, para que otra fórmula no herede lo suyo.
  formulaDelOrigenId: string
  // La versión que se edita; con diseño nulo no hay nada que editar.
  leida: DisenoParaEditar | null
  niveles: readonly NivelDelDiseno[]
  // Los tonos del catálogo, en la forma de la celda; sin ellos la hoja se dibuja sin colores.
  tonos: readonly Tono[]
  // Sus claves y nombres para elegir el color; nulo si no se pudo leer.
  catalogo: readonly TonoDelCatalogo[] | null
  // El catálogo de tablas del origen (la ayuda de una celda); nulo si no se pudo leer.
  tablas: readonly TablaDelCatalogoDelOrigen[] | null
  // Los niveles con su tope, para «+ Nuevo nivel»: sólo con `equipo.roles.gestionar` (nulo sin él o si no se leyó).
  listaDeNiveles: ListaDeNiveles | null
  // `cotizaciones.configurar` (sin origen, como `tono_crear()`): ofrece «+ Nuevo color».
  puedeCrearColores: boolean
  // Con el Modo Live: la hoja en sólo lectura en todo ancho, sin el editor.
  soloLectura: boolean
}

// La versión que se edita y cuántas veces cambió por algo que el editor no hizo (va en su `key`).
function useGeneracion(leida: DisenoParaEditar | null) {
  const version: VersionDelEditor = leida === null ? null : { estado: leida.estado, id: leida.id }
  const [generacion, setGeneracion] = useState({ version, vez: 0 })
  if (!mismaVersionDelEditor(generacion.version, version)) {
    setGeneracion({
      version,
      vez: generacion.vez + (pideOtroEditor(generacion.version, version) ? 1 : 0),
    })
  }
  return generacion.vez
}

// La pestaña «Hoja» de la Fórmula de un origen (Configuración › Orígenes): el editor de la hoja desde 1.024 px y, por debajo (o con el Modo Live), la hoja en sólo lectura. Sin
// versión o sin diseño, un vacío. El editor no se vuelve a montar al guardar (su `key` no lleva la versión); lo monta de nuevo «Recargar» tras un conflicto
// (en la misma transición que trae la pestaña, sobre lo que haya entonces) y una versión que cambió por otra cosa (`pideOtroEditor()`: «Publicar…» de la barra).
// «+ Nuevo nivel» (del núcleo, con su modal montado una vez aquí) y «+ Nuevo color» suman lo creado a lo leído hasta que la página lo traiga.
export function DisenoDelOrigen({
  origen,
  formulaDelOrigenId,
  leida,
  listaDeNiveles,
  puedeCrearColores,
  tablas,
  soloLectura,
  ...leidos
}: Props) {
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [recargando, recargarPagina] = useTransition()
  const recargar = () => {
    recargarPagina(() => {
      router.refresh()
      setVuelta((v) => v + 1)
    })
  }
  const vez = useGeneracion(leida)
  const creados = useCreadosAlVuelo(leidos)
  const diseno = leida?.diseno ?? null
  const { editable } = useVistaDelEditor()
  if (leida === null || diseno === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {leida === null
          ? 'Esta fórmula todavía no tiene una versión: guarda su planilla primero.'
          : 'Esta versión no tiene diseño de la hoja.'}
      </p>
    )
  }
  if (soloLectura) {
    return (
      <HojaSoloLectura
        origen={origen}
        leida={leida}
        diseno={diseno}
        tonos={creados.tonos}
        aviso={SOLO_LECTURA_EN_EL_LIVE}
      />
    )
  }
  if (!editable) {
    return <HojaSoloLectura origen={origen} leida={leida} diseno={diseno} tonos={creados.tonos} />
  }
  const editor = (nuevoNivel: ApoyoDelInspector['nuevoNivel']) => (
    <EditorDeLaHoja
      key={`${formulaDelOrigenId}:${String(vuelta)}:${String(vez)}`}
      origen={origen}
      leida={leida}
      disenoLeido={diseno}
      niveles={creados.niveles}
      tonos={creados.tonos}
      catalogo={creados.catalogo}
      tablas={tablas}
      nuevoNivel={nuevoNivel}
      alCrearColor={puedeCrearColores ? creados.sumarColor : null}
      recargando={recargando}
      alRecargar={recargar}
    />
  )
  if (listaDeNiveles === null) return editor(null)
  return (
    <NuevoNivelAlVuelo
      lista={listaDeNiveles}
      alCrear={(nivel) => {
        creados.sumarNivel({
          clave: nivel.clave,
          nombre: nivel.nombre,
          retirado: nivel.retiradoEn !== null,
        })
      }}
    >
      {editor}
    </NuevoNivelAlVuelo>
  )
}
