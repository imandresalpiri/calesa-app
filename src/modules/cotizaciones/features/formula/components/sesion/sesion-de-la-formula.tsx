'use client'

import { useLayoutEffect, useState, type ComponentType } from 'react'
import type { EstadoDeLaEdicion } from '../../../../entities/estado-de-la-edicion'
import { modoInicial } from '../../../../entities/cabecera-de-la-hoja'
import type { CatalogoDeTablas } from '../../../../entities/compilador'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import {
  UNIDAD_EN_CEROS,
  type UnidadDeEjemplo,
} from '../../../../entities/formula/unidad-de-ejemplo'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../../entities/tarjeta-en-vivo'
import type { PropsDelNuevoColor } from '../../../../entities/nuevo-color'
import { useEditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import { useLecturaDeLaDefinicion } from '../../hooks/use-lectura-de-la-definicion'
import { PlanillaDiferida } from '../planilla/diferidos'
import type { TipoDeCambioDeLaEmpresa } from '../planilla/tipos'
import { EstadoDeLaLectura } from './estado-de-la-lectura'

export type PropsDeLaSesion = {
  origen: { id: string; nombre: string }
  // La fórmula del origen que se edita (sus enlaces a la tarjeta).
  formulaDelOrigenId: string
  // La versión que se edita: la del borrador o, sin él, la publicada.
  formulaId: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  // El estado de lo guardado, para la barra de la fórmula.
  estadoGuardado: EstadoDeLaEdicion
  // Tras un conflicto al guardar: trae la pestaña de nuevo y vuelve a montar la sesión sobre lo que haya.
  recargando: boolean
  alRecargar: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera (se publica lo guardado).
  alCambiarPendientes: (hay: boolean) => void
  // La tarjeta en vivo de la planilla: la lectura del servidor y el dibujo del área `tarjeta` (este módulo no la importa).
  tarjeta: LecturaDeLaTarjetaEnVivo
  // El catálogo de tablas del origen, con el que se compila BUSCARV; null si no se pudo leer.
  tablas: CatalogoDeTablas
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  // «+ Nuevo color» del panel de una banda (área `diseno`); nulo sin `cotizaciones.configurar`.
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  puedeCambiarTiposDeCambio: boolean
  // Los tipos de cambio de la empresa: «Tipo de celda › Tipo de cambio».
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
  // Con el Modo Live: la planilla se ve y no se edita.
  soloLectura?: boolean
}

// Con la versión leída: la fórmula de trabajo, y la unidad de ejemplo y el modo elegido de la planilla (recargar vuelve a ceros).
function SesionLista({ leida, ...p }: PropsDeLaSesion & { leida: FormulaParaEditar }) {
  const editor = useEditorDeLaFormula({
    origenId: p.origen.id,
    leida,
    tablas: p.tablas,
    soloLectura: p.soloLectura === true,
  })
  const [unidad, setUnidad] = useState<UnidadDeEjemplo>(UNIDAD_EN_CEROS)
  const cabecera = leida.diseno?.cabecera
  const [modo, setModo] = useState(() =>
    modoInicial({
      modos: cabecera?.modos ?? [],
      modoPorDefecto: cabecera?.modo_por_defecto ?? null,
    }),
  )
  const hayCambios = editor.guardado.hayCambios
  const { alCambiarPendientes } = p
  // Registro hijo → padre en `useLayoutEffect`: el padre dibuja «Publicar…» con lo de ahora, también tras hidratar.
  useLayoutEffect(() => {
    alCambiarPendientes(hayCambios)
  }, [hayCambios, alCambiarPendientes])
  useLayoutEffect(
    () => () => {
      alCambiarPendientes(false)
    },
    [alCambiarPendientes],
  )
  return (
    <PlanillaDiferida
      editor={editor}
      diseno={leida.diseno}
      origen={p.origen}
      formulaDelOrigenId={p.formulaDelOrigenId}
      sobre={p.sobre}
      estadoGuardado={p.estadoGuardado}
      unidad={unidad}
      alCambiarUnidad={setUnidad}
      modo={modo}
      alElegirModo={setModo}
      recargando={p.recargando}
      alRecargar={p.alRecargar}
      tarjeta={p.tarjeta}
      TarjetaEnVivo={p.TarjetaEnVivo}
      NuevoColor={p.NuevoColor}
      puedeCambiarTiposDeCambio={p.puedeCambiarTiposDeCambio}
      tiposDeCambio={p.tiposDeCambio}
    />
  )
}

// La sesión de edición de la fórmula de un origen: lee la versión desde el navegador al montarse y tiene **la** fórmula de trabajo (`useEditorDeLaFormula`, una sola
// vez), que la planilla edita. Lo aplicado vive en la pestaña hasta «Guardar el borrador» (4.21-3b-1). Lee la versión con la que abrió y no otra (C8): guardar sobre la publicada crea el borrador y la pestaña cambia de versión, pero la sesión
// sigue sobre lo suyo; sólo «Recargar» la vuelve a montar.
export function SesionDeLaFormula(props: PropsDeLaSesion) {
  const [formulaId] = useState(props.formulaId)
  const { estado, reintentar } = useLecturaDeLaDefinicion(formulaId)
  if (estado.tipo === 'lista') return <SesionLista {...props} leida={estado.leida} />
  return (
    <section aria-label="Planilla de la fórmula" className="grid min-w-0 gap-3">
      <EstadoDeLaLectura
        estado={estado}
        nombreDelOrigen={props.origen.nombre}
        alReintentar={reintentar}
      />
    </section>
  )
}
