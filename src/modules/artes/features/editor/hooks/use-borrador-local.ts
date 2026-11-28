'use client'

import { useEffect, useRef, useState } from 'react'
import { avisar } from '@/shared/ui/toasts'
import type { DocumentoDeArte } from '../../../entities/documento'
import { ESPERA_DEL_BORRADOR_MS, type BorradorDeArte } from '../../../entities/editor/borrador'
import type { InicioDelEditor } from './use-inicio-del-editor'

export type LoQueSeEdita = { documento: DocumentoDeArte; nombre: string }

// `reemplazar` deja un paso en el historial (deshacer vuelve a lo de antes); `reiniciar` arranca de cero.
export type PonerEnElEditor = (lo: LoQueSeEdita, como: 'reemplazar' | 'reiniciar') => void

type Args = {
  // La del borrador de quien mira (`claveDelBorrador`).
  clave: string
  inicio: InicioDelEditor
  actual: LoQueSeEdita
  guardado: LoQueSeEdita
  // La versión guardada sobre la que se edita (cambia al guardar).
  version: string
  hayCambios: boolean
  soloLectura: boolean
  alPoner: PonerEnElEditor
}

export const MENSAJE_DEL_BORRADOR_REPUESTO = 'Recuperamos los cambios que no guardaste.'

function escribir(clave: string, borrador: BorradorDeArte): void {
  try {
    localStorage.setItem(clave, JSON.stringify(borrador))
  } catch {
    // Sin almacenamiento (lleno o bloqueado): el editor sigue sin borrador.
  }
}

function quitar(clave: string): void {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento: no hay nada que quitar.
  }
}

// El borrador local (`localStorage`, por plantilla): lo que se cambió y no se guardó, anotado `ESPERA_DEL_BORRADOR_MS` después del último
// cambio y al salir de la página. Guardar lo borra. El repuesto al abrir se avisa con «Descartar»; el de una versión vieja (otra persona
// guardó después) queda ofrecido —`ofrecido`— hasta «Recuperarlos» o «Descartar», y mientras tanto no se pisa. En sólo lectura, nada.
export function useBorradorLocal(args: Args) {
  const { clave, inicio, actual, version, hayCambios, soloLectura } = args
  const [ofrecido, setOfrecido] = useState(inicio.que === 'ofrecer' ? inicio.borrador : null)
  const pendiente = useRef<BorradorDeArte | null>(null)
  const ultimo = useRef(args)
  const avisado = useRef(false)
  useEffect(() => {
    ultimo.current = args
  })

  useEffect(() => {
    if (inicio.que !== 'reponer' || avisado.current) {
      return
    }
    avisado.current = true
    avisar(MENSAJE_DEL_BORRADOR_REPUESTO, {
      etiqueta: 'Descartar',
      alHacer: () => {
        ultimo.current.alPoner(ultimo.current.guardado, 'reiniciar')
      },
    })
  }, [inicio.que])

  useEffect(() => {
    if (soloLectura || ofrecido !== null) {
      return
    }
    if (!hayCambios) {
      pendiente.current = null
      quitar(clave)
      return
    }
    const borrador: BorradorDeArte = {
      documento: actual.documento,
      nombre: actual.nombre,
      versionBase: version,
      escritoEn: new Date().toISOString(),
    }
    pendiente.current = borrador
    const espera = setTimeout(() => {
      escribir(clave, borrador)
      pendiente.current = null
    }, ESPERA_DEL_BORRADOR_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [clave, actual.documento, actual.nombre, version, hayCambios, soloLectura, ofrecido])

  // Al cerrar la pestaña o al desmontarse (recargar tras un conflicto), lo que esperaba su turno se anota ya.
  useEffect(() => {
    const anotarYa = () => {
      if (pendiente.current) {
        escribir(clave, pendiente.current)
        pendiente.current = null
      }
    }
    window.addEventListener('pagehide', anotarYa)
    return () => {
      window.removeEventListener('pagehide', anotarYa)
      anotarYa()
    }
  }, [clave])

  return {
    ofrecido,
    recuperar: () => {
      if (ofrecido === null) {
        return
      }
      setOfrecido(null)
      args.alPoner({ documento: ofrecido.documento, nombre: ofrecido.nombre }, 'reemplazar')
    },
    descartarOfrecido: () => {
      setOfrecido(null)
      quitar(clave)
    },
    // Al salir con «Descartar»: lo que esperaba anotarse ya no se anota, y lo anotado se borra.
    olvidar: () => {
      pendiente.current = null
      quitar(clave)
    },
  }
}
