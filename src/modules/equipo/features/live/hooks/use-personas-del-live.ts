'use client'

import { useState } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { avisarError } from '@/shared/ui/toasts'
import { leerMasPersonasDelLive } from '../../../composicion.client'
import {
  cursorDeLaPagina,
  sumarPagina,
  type PaginaDePersonasDelLive,
} from '../../../entities/live-configuracion'

// La lista de «Ajustes por persona»: la primera página la lee el servidor (con `?q=`, o quienes tienen lo propio) y «Ver más», sólo sin búsqueda,
// sigue por el cursor desde el navegador hasta `TOPE_DE_LO_CARGADO`. Si el servidor vuelve a leer (otra búsqueda, algo guardado), la lista empieza de
// nuevo con lo que trajo.
export function usePersonasDelLive(primera: PaginaDePersonasDelLive, buscando: boolean) {
  const [pagina, setPagina] = useState(primera)
  const [vista, setVista] = useState(primera)
  const [pidiendo, setPidiendo] = useState(false)
  if (vista !== primera) {
    setVista(primera)
    setPagina(primera)
  }
  const alTope = pagina.personas.length >= TOPE_DE_LO_CARGADO
  const cursor = buscando || alTope ? null : cursorDeLaPagina(pagina)

  async function verMas() {
    if (cursor === null) {
      return
    }
    setPidiendo(true)
    const lectura = await leerMasPersonasDelLive(cursor)
    setPidiendo(false)
    if (!lectura.ok) {
      avisarError(lectura.error)
      return
    }
    setPagina((antes) => sumarPagina(antes, lectura.data))
  }

  return {
    personas: pagina.personas,
    hayMas: pagina.hayMas,
    alTope,
    puedeVerMas: cursor !== null,
    pidiendo,
    verMas,
  }
}
