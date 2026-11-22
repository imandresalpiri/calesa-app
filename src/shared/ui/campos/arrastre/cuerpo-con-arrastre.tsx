'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useId } from 'react'
import { queHaceLaSoltada, type QueHaceLaSoltada } from '@/shared/lib/campos'
import { avisar } from '@/shared/ui/toasts'
import type { PropsDelCuerpo } from '../cuerpo'
import { CuerpoDelEditor } from '../cuerpo-del-editor'
import { anunciosDelEditor, INSTRUCCIONES_DE_ORDEN } from './anuncios'
import { ArrastreActivo } from './contexto'
import { coordenadasDelContenedor } from './coordenadas-del-contenedor'
import { ARRASTRABLES } from './envoltorios'

// Con el puntero, lo que queda debajo; si no hay nada (entre dos filas) o con el teclado, lo más cercano.
const colision: CollisionDetection = (argumentos) => {
  const debajo = pointerWithin(argumentos)
  return debajo.length > 0 ? debajo : closestCenter(argumentos)
}

// El cuerpo del editor con el arrastre (diferido: dnd-kit llega cuando hace falta). Un campo se ordena dentro de su grupo; un campo o un
// dato común se suelta en una casilla de dato clave, y las casillas se ordenan entre sí. Cada paso se anuncia; lo que no se puede, con su
// motivo (también en un aviso).
export function CuerpoConArrastre(props: PropsDelCuerpo) {
  const id = useId()
  const { casillas, todos, llaves, conAsa, ocupado } = props
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: coordenadasDelContenedor }),
  )
  const soltada = (activo: string, sobre: string | null): QueHaceLaSoltada =>
    queHaceLaSoltada({
      activo,
      sobre,
      campos: todos,
      casillas:
        casillas === null
          ? null
          : {
              llaves: casillas.lista.map((casilla) => casilla.llave),
              tope: casillas.tope,
              motivoTope: casillas.motivoTope,
              llaveDeCampo: (campoId) => llaves.get(campoId) ?? null,
            },
    })
  const etiquetas = new Map<string, string>([
    ...(casillas?.lista.map((casilla) => [casilla.llave, casilla.etiqueta] as const) ?? []),
    ...(props.fijos?.filas.map((fila) => [fila.llave, fila.etiqueta] as const) ?? []),
  ])
  const nombres = {
    deCampo: (campoId: string) => todos.find((campo) => campo.id === campoId)?.etiqueta ?? '',
    deLlave: (llave: string) => etiquetas.get(llave) ?? '',
    zona: casillas?.zona ?? '',
  }

  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (ocupado || over === null) {
      return
    }
    const hecho = soltada(String(active.id), String(over.id))
    switch (hecho.tipo) {
      case 'mover-campo':
        props.alSoltarCampo(hecho.id, hecho.despuesDe)
        return
      case 'poner-en-casilla':
        casillas?.alPoner(hecho.llave, hecho.posicion)
        return
      case 'mover-casilla':
        casillas?.alMover(hecho.desde, hecho.hasta)
        return
      case 'nada':
        if (hecho.motivo !== null) {
          avisar(hecho.motivo)
        }
    }
  }

  return (
    <ArrastreActivo value={conAsa && !ocupado}>
      <DndContext
        id={id}
        sensors={sensores}
        collisionDetection={colision}
        onDragEnd={alSoltar}
        accessibility={{
          screenReaderInstructions: { draggable: INSTRUCCIONES_DE_ORDEN },
          announcements: anunciosDelEditor(nombres, soltada),
        }}
      >
        <CuerpoDelEditor {...props} envoltorios={ARRASTRABLES} />
      </DndContext>
    </ArrastreActivo>
  )
}
