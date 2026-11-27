'use client'

import { cn } from '@/shared/lib/utils'
import type { Grupo } from '../../../../../entities/formula'
import type { TramoALaVista } from '../../../../../entities/formula/filas-a-la-vista'
import { filaDe } from '../../../../../entities/formula/hoja-de-la-planilla'
import { useArrastreDeFila, type Arrastre } from '../../../hooks/use-arrastre-de-fila'
import { idDeLaGrilla, type Planilla } from '../../../hooks/use-planilla'
import { MenuDeLaFila } from '../menu/menu-de-la-fila'
import { CabeceraDeLaBanda } from './cabecera-de-la-banda'
import { CabeceraDeLaCuadricula } from './cabecera-de-la-cuadricula'
import { EntradaDeLaPlanilla } from './entrada-de-la-planilla'
import { celdaDelEvento, retenerElFoco, soltarFila } from './eventos-de-la-cuadricula'
import { FilaDeLaCuadricula } from './fila-de-la-cuadricula'
import { propsDeLaFila } from './props-de-la-fila'

type PropsDelTramo = {
  planilla: Planilla
  tramo: TramoALaVista
  grupo: Grupo | undefined
  // El rechazo de la banda va sólo en su primer tramo.
  conRechazo: boolean
  arrastre: Arrastre | null
}

function TramoDeLaCuadricula({ planilla, tramo, grupo, conRechazo, arrastre }: PropsDelTramo) {
  const { edicion, cuadricula, hoja, bandas, paneles } = planilla
  const e = edicion.edicion
  const activa =
    cuadricula.activa === null
      ? undefined
      : filaDe(hoja, hoja.numeroDe.get(cuadricula.activa.id) ?? 0)
  const entrada = e === null ? null : <EntradaDeLaPlanilla planilla={planilla} edicion={e} />
  // En sólo lectura (Modo Live), ni la fila ni la banda llevan su «⋯».
  const soloLectura = planilla.editor.soloLectura
  const menu =
    activa === undefined || soloLectura ? null : <MenuDeLaFila planilla={planilla} fila={activa} />
  const rechazo = planilla.editor.rechazo
  return (
    <tbody {...(grupo === undefined ? {} : { 'data-tono': grupo.tono, 'data-grupo': grupo.id })}>
      {grupo === undefined ? null : (
        <CabeceraDeLaBanda
          grupo={grupo}
          tipoDeCambio={planilla.tipoDeCambioDe(grupo.bucket)}
          rechazo={conRechazo && rechazo?.grupoId === grupo.id ? rechazo.mensaje : null}
          vacia={tramo.filas.length === 0}
          conMenu={!soloLectura}
          motivoParaQuitar={bandas.motivoParaQuitar(grupo.id)}
          alEditar={() => {
            paneles.banda.abrir({ banda: grupo.id })
          }}
          alQuitar={() => {
            bandas.quitar(grupo.id)
          }}
        />
      )}
      {tramo.filas.map((fila) => (
        <FilaDeLaCuadricula
          key={fila.id}
          {...propsDeLaFila(planilla, fila, { arrastre, entrada, menu })}
        />
      ))}
    </tbody>
  )
}

// La tabla de la cuadrícula (`role="grid"`, D19): un solo lugar en el orden de Tab con la celda activa por `aria-activedescendant`. Los eventos van delegados: el clic
// elige (o, escribiendo, nombra esa celda), el doble clic escribe, el clic derecho abre el menú de la fila y las teclas mueven o escriben. Arrastrar el número mueve
// la fila. Cada tramo de filas seguidas con la misma banda es un `<tbody>` con su cabecera y su color.
export function TablaDeLaCuadricula({
  planilla,
  nombreDelOrigen,
}: {
  planilla: Planilla
  nombreDelOrigen: string
}) {
  const { cuadricula, acciones, edicion, hoja, ops, menu } = planilla
  const editando = edicion.edicion !== null
  const { arrastre, alApretar } = useArrastreDeFila({
    apagado: editando || !planilla.editor.libre || planilla.editor.soloLectura,
    alSoltar: (id, sobre) => {
      soltarFila(hoja, ops, id, sobre)
    },
  })
  const grupos = new Map((planilla.editor.trabajo.definicion.grupos ?? []).map((g) => [g.id, g]))
  const vistos = new Set<string>()
  return (
    <table
      id={idDeLaGrilla(planilla.prefijo)}
      role="grid"
      tabIndex={0}
      aria-label={`Filas de la fórmula de ${nombreDelOrigen}`}
      aria-rowcount={hoja.filas.length + 1}
      aria-colcount={5}
      aria-activedescendant={editando ? undefined : (cuadricula.idActiva ?? undefined)}
      className={cn(
        'w-full min-w-[46rem] border-collapse bg-(--color-surface) text-(length:--text-sm) outline-none focus-visible:shadow-(--shadow-focus)',
        arrastre !== null && 'cursor-grabbing select-none',
      )}
      onMouseDown={(e) => {
        retenerElFoco(e, editando)
      }}
      onPointerDown={alApretar}
      onClick={(e) => {
        const celda = celdaDelEvento(e)
        if (celda !== null) acciones.alClic(celda, e.shiftKey)
      }}
      onDoubleClick={(e) => {
        const celda = celdaDelEvento(e)
        if (celda !== null) acciones.alDobleClic(celda)
      }}
      onContextMenu={(e) => {
        const celda = celdaDelEvento(e)
        if (celda === null || editando || arrastre !== null || planilla.editor.soloLectura) return
        e.preventDefault()
        cuadricula.elegir(celda)
        menu.alCambiar(true)
      }}
      onKeyDown={(e) => {
        cuadricula.teclear(e, acciones.teclado)
      }}
      onFocus={(e) => {
        if (e.target === e.currentTarget) cuadricula.alEnfocar()
      }}
    >
      <CabeceraDeLaCuadricula />
      {planilla.tramos.map((tramo, i) => {
        const grupo = tramo.grupo === null ? undefined : grupos.get(tramo.grupo)
        const primero = tramo.grupo !== null && !vistos.has(tramo.grupo)
        if (tramo.grupo !== null) vistos.add(tramo.grupo)
        return (
          <TramoDeLaCuadricula
            key={`${tramo.grupo ?? 'sin-banda'}:${String(tramo.filas[0]?.numero ?? `vacio-${String(i)}`)}`}
            planilla={planilla}
            tramo={tramo}
            grupo={grupo}
            conRechazo={primero}
            arrastre={arrastre}
          />
        )
      })}
    </table>
  )
}
