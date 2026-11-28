'use client'

import { useState } from 'react'
import type { DocumentoDeArte } from '../../../entities/documento'
import {
  leerBorrador,
  queHacerConElBorrador,
  type BorradorDeArte,
  type QueHacerConElBorrador,
} from '../../../entities/editor/borrador'
import { mismoJson } from '../../../entities/editor/mismo-json'
import type { PlantillaDelEditor } from '../../../entities/tipos'

export type InicioDelEditor = {
  // Con lo que arranca el editor: lo guardado o, si se repone el borrador, lo del borrador.
  documento: DocumentoDeArte
  nombre: string
  que: QueHacerConElBorrador
  borrador: BorradorDeArte | null
}

function leerDelNavegador(clave: string): BorradorDeArte | null {
  try {
    return leerBorrador(localStorage.getItem(clave))
  } catch {
    return null
  }
}

function decidir(
  plantilla: PlantillaDelEditor,
  clave: string,
  soloLectura: boolean,
): InicioDelEditor {
  const deLaPlantilla = {
    documento: plantilla.documento,
    nombre: plantilla.nombre,
    que: 'nada',
    borrador: null,
  } as const
  if (soloLectura) {
    return deLaPlantilla
  }
  const borrador = leerDelNavegador(clave)
  const que = queHacerConElBorrador({
    borrador,
    versionActual: plantilla.actualizadoEn,
    iguales:
      borrador !== null &&
      borrador.nombre === plantilla.nombre &&
      mismoJson(borrador.documento, plantilla.documento),
  })
  if (borrador === null || que === 'nada') {
    return deLaPlantilla
  }
  return que === 'reponer'
    ? { documento: borrador.documento, nombre: borrador.nombre, que, borrador }
    : { ...deLaPlantilla, que, borrador }
}

// Con qué arranca el editor, decidido una vez al montarse (el editor sólo se dibuja en el navegador: leer `localStorage` acá no cambia la
// hidratación). Un borrador sobre la versión guardada se repone ya en el primer dibujo, sin mostrar antes lo guardado; uno sobre una versión
// vieja se ofrece. En sólo lectura no hay borrador.
// `clave`: la del borrador de quien mira (`claveDelBorrador`).
export function useInicioDelEditor(
  plantilla: PlantillaDelEditor,
  clave: string,
  soloLectura: boolean,
): InicioDelEditor {
  const [inicio] = useState(() => decidir(plantilla, clave, soloLectura))
  return inicio
}
