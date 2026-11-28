'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useAtajo, useAyudaDePantalla } from '@/shared/ui/atajos'
import {
  accionDeLaTecla,
  esCampoEditable,
  GRUPO_DE_AYUDA_DEL_EDITOR,
  type AccionDelEditor,
  type HerramientaDelEditor,
} from '../../../entities/editor/atajos'
import type { CamaraDelEditor, EditorDeArte, ManejoDelLienzo } from '../tipos'
import { ejecutarAccionDelTeclado, type ContextoDelTeclado } from './acciones-del-teclado'

type Args = {
  editor: EditorDeArte
  lienzo: RefObject<ManejoDelLienzo | null>
  camara: CamaraDelEditor
  alElegirHerramienta: (herramienta: HerramientaDelEditor) => void
  alManoTransitoria: (activa: boolean) => void
}

// Lo que tiene sus propias teclas: un diálogo o un menú abiertos (Base UI), una lista de pestañas o de opciones (las flechas), y un botón o
// un enlace con el foco (Enter y Espacio lo activan).
const CON_TECLAS_PROPIAS = '[role=dialog], [role=alertdialog], [role=menu], [role=listbox]'
const CON_FLECHAS_PROPIAS = '[role=tablist], [role=radiogroup], [role=slider]'
const ACTIVABLE = 'button, a[href], [role=button], [role=tab], [role=checkbox], [role=switch]'
const FLECHAS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

function teclaDeOtro(evento: KeyboardEvent, accion: AccionDelEditor): boolean {
  const destino = evento.target
  if (!(destino instanceof Element)) {
    return false
  }
  if (destino.closest(CON_TECLAS_PROPIAS)) {
    return true
  }
  if (FLECHAS.has(evento.key) && destino.closest(CON_FLECHAS_PROPIAS)) {
    return true
  }
  const activa = accion.tipo === 'enter' || (accion.tipo === 'mano-transitoria' && accion.activa)
  return activa && destino.closest(ACTIVABLE) !== null
}

// Los atajos del editor de artes, escuchados en `window` (como V1): fuera de un campo donde se escribe y de lo que tiene sus propias teclas,
// la tecla da su acción (`accionDeLaTecla()`) y sólo entonces se frena al navegador. Espacio mantenido es la mano; soltarlo, o que la ventana
// pierda el foco, la suelta. Esc (deseleccionar), Ctrl+S y «?» van por el proveedor global (`useAtajo`), que suma la lista del editor a «?».
export function useAtajosDelEditor({ lienzo, ...resto }: Args) {
  const ultimo = useRef<Omit<ContextoDelTeclado, 'lienzo' | 'pegadas'>>(resto)
  const pegadas = useRef({ vez: 0 })
  useEffect(() => {
    ultimo.current = resto
  })
  useAtajo(
    'cerrar',
    () => {
      resto.editor.despachar({ tipo: 'elegir', ids: [], modo: 'reemplazar' })
    },
    resto.editor.estado.seleccion.length > 0,
  )
  useAyudaDePantalla(GRUPO_DE_AYUDA_DEL_EDITOR)
  useEffect(() => {
    const atender = (momento: 'bajar' | 'subir') => (evento: KeyboardEvent) => {
      if (evento.defaultPrevented || evento.isComposing || esCampoEditable(evento.target)) {
        return
      }
      const accion = accionDeLaTecla(evento, momento)
      if (accion === null || teclaDeOtro(evento, accion)) {
        return
      }
      evento.preventDefault()
      ejecutarAccionDelTeclado(
        { ...ultimo.current, lienzo: lienzo.current, pegadas: pegadas.current },
        accion,
      )
    }
    const alBajar = atender('bajar')
    const alSubir = atender('subir')
    const alSalir = () => {
      ultimo.current.alManoTransitoria(false)
    }
    window.addEventListener('keydown', alBajar)
    window.addEventListener('keyup', alSubir)
    window.addEventListener('blur', alSalir)
    return () => {
      window.removeEventListener('keydown', alBajar)
      window.removeEventListener('keyup', alSubir)
      window.removeEventListener('blur', alSalir)
    }
  }, [lienzo])
}
