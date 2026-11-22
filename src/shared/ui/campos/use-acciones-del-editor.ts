'use client'

import { destinoDeMovimiento, type CampoBase } from '@/shared/lib/campos'
import type { AccionDelCampo } from './acciones-de-campo'
import type { AccionDeCasilla } from './cuerpo'
import type { CasillasDelEditor, DeLaFila, EdicionesDeCampos } from './tipos'

type Args<Cambios, Nuevo> = {
  // El layout en el orden que se ve (con el movimiento en vuelo ya aplicado).
  enOrden: readonly CampoBase[]
  // Un cambio en vuelo: hasta que vuelve, nada se toca (cada uno manda la versión que vio). Abrir sí.
  ocupado: boolean
  casillas: CasillasDelEditor | null
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  mover: (campo: DeLaFila, despuesDe: string | null) => void
  abrir: (campoId: string, conEliminar: boolean) => void
}

// Lo que hace cada acción del editor: las del «⋯» de una fila, de una casilla y de una fila fija, y soltar un campo.
export function useAccionesDelEditor<Cambios, Nuevo>(args: Args<Cambios, Nuevo>) {
  const { enOrden, ocupado, casillas, ediciones, mover, abrir } = args
  const buscar = (campoId: string) => enOrden.find((otro) => otro.id === campoId)

  function alternarDatoClave(campo: CampoBase, hacer: boolean) {
    if (casillas === null) {
      return
    }
    const llave = casillas.llaveDeCampo(campo)
    if (hacer) {
      casillas.alPoner(llave, casillas.lista.length)
    } else {
      casillas.alQuitar(llave)
    }
  }

  function alElegir(campoId: string, accion: AccionDelCampo) {
    const campo = buscar(campoId)
    if (campo === undefined) {
      return
    }
    if (accion === 'abrir' || accion === 'eliminar') {
      abrir(campo.id, accion === 'eliminar')
    } else if (ocupado) {
      return
    } else if (accion === 'subir' || accion === 'bajar') {
      const destino = destinoDeMovimiento(enOrden, campo.id, accion)
      if (destino) {
        mover(campo, destino.despuesDe)
      }
    } else if (accion === 'activar' || accion === 'desactivar') {
      void ediciones.cambiarActivo(campo, accion === 'activar')
    } else {
      alternarDatoClave(campo, accion === 'hacer-dato-clave')
    }
  }

  function alElegirCasilla(posicion: number, accion: AccionDeCasilla) {
    if (casillas === null || ocupado) {
      return
    }
    if (accion === 'quitar') {
      const casilla = casillas.lista[posicion]
      if (casilla) {
        casillas.alQuitar(casilla.llave)
      }
    } else {
      casillas.alMover(posicion, accion === 'subir' ? posicion - 1 : posicion + 1)
    }
  }

  function alAlternarFijo(llave: string) {
    if (casillas === null || ocupado) {
      return
    }
    if (casillas.lista.some((casilla) => casilla.llave === llave)) {
      casillas.alQuitar(llave)
    } else {
      casillas.alPoner(llave, casillas.lista.length)
    }
  }

  function alSoltarCampo(campoId: string, despuesDe: string | null) {
    const campo = buscar(campoId)
    if (campo && !ocupado) {
      mover(campo, despuesDe)
    }
  }

  return { alElegir, alElegirCasilla, alAlternarFijo, alSoltarCampo }
}
