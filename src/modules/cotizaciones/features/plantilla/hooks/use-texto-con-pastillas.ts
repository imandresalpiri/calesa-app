'use client'

// El pegamento del campo del texto con datos con el DOM (glosario: «Texto con datos», «Pastilla»). Lo que se tipea lo escribe el navegador y se lee de vuelta; Enter,
// pegar, Retroceso y Supr junto a una pastilla, las flechas junto a una pastilla y Ctrl+Z los maneja el modelo (`edicion/texto-con-datos.ts`), así todos los
// navegadores hacen lo mismo. El DOM se vuelve a dibujar sólo si las partes de afuera (deshacer, insertar un dato) no son las que dice. El cursor se guarda al
// cambiar la selección: abrir el buscador no lo pierde.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import type { ParteDelTexto } from '../../../entities/cuadricula-de-la-tarjeta'
import {
  datoJuntoAlCursor,
  largoEnUnidades,
  normalizarPartes,
  quitarParte,
  reemplazarConTexto,
  type PartesConCursor,
} from '../../../entities/plantilla/edicion/texto-con-datos'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import {
  cursorEnUnidades,
  dibujar,
  leerPartes,
  ponerCursor,
  unidadesAntesDe,
  type Cursor,
} from './pastillas-en-el-dom'

type Args = {
  // Lo que muestra el campo.
  partes: readonly ParteDelTexto[]
  contexto: ContextoDePlantilla
  // `deUnDato`: quitar una pastilla es su propio paso de deshacer; lo tipeado se junta.
  alCambiar: (partes: ParteDelTexto[], deUnDato: boolean) => void
  alTocarDato: (i: number) => void
  alDeshacer: () => void
  alRehacer: () => void
}

type Cambio = PartesConCursor & { readonly deUnDato: boolean }
type Pendiente = { pos: number; enfocar: boolean }

const mismas = (a: readonly ParteDelTexto[], b: readonly ParteDelTexto[]) =>
  JSON.stringify(a) === JSON.stringify(b)

function hayDatoEntre(partes: readonly ParteDelTexto[], desde: number, hasta: number): boolean {
  let inicio = 0
  for (const p of partes) {
    if (typeof p !== 'string' && inicio >= desde && inicio < hasta) return true
    inicio += typeof p === 'string' ? p.length : 1
  }
  return false
}

// Retroceso o Supr: lo elegido (por el modelo, aunque tenga pastillas) o la pastilla junto al cursor; nulo si lo deja al navegador.
function alBorrar(partes: readonly ParteDelTexto[], c: Cursor, atras: boolean): Cambio | null {
  if (c.desde !== c.hasta) {
    const deUnDato = hayDatoEntre(partes, Math.min(c.desde, c.hasta), Math.max(c.desde, c.hasta))
    return { ...reemplazarConTexto(partes, c.desde, c.hasta, ''), deUnDato }
  }
  const i = datoJuntoAlCursor(partes, c.desde, atras ? 'antes' : 'despues')
  return i === null ? null : { ...quitarParte(partes, i), deUnDato: true }
}

// Lo que hace una tecla con el modelo: un cambio, mover el cursor sobre una pastilla o nada (la deja al navegador).
function conLaTecla(
  e: KeyboardEvent,
  partes: readonly ParteDelTexto[],
  c: Cursor,
): Cambio | { mover: number } | null {
  if (e.key === 'Enter')
    return { ...reemplazarConTexto(partes, c.desde, c.hasta, '\n'), deUnDato: false }
  if (e.key === 'Backspace' || e.key === 'Delete') return alBorrar(partes, c, e.key === 'Backspace')
  if (c.desde !== c.hasta || e.shiftKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight'))
    return null
  const izquierda = e.key === 'ArrowLeft'
  const junto = datoJuntoAlCursor(partes, c.desde, izquierda ? 'antes' : 'despues')
  return junto === null ? null : { mover: c.desde + (izquierda ? -1 : 1) }
}

// El cursor del campo, guardado en cada cambio de la selección dentro de él (ref para leerlo al instante, estado para el motivo de «Insertar dato»).
function useCursorDelCampo(ref: RefObject<HTMLDivElement | null>) {
  const guardado = useRef<Cursor | null>(null)
  const [cursor, setCursor] = useState<Cursor | null>(null)
  useEffect(() => {
    const raiz = ref.current
    if (raiz === null) return
    const documento = raiz.ownerDocument
    const alCambiarLaSeleccion = () => {
      const sel = documento.getSelection()
      if (sel === null || sel.anchorNode === null || !raiz.contains(sel.anchorNode)) return
      const c = cursorEnUnidades(raiz)
      if (c === null) return
      guardado.current = c
      setCursor((antes) => (antes?.desde === c.desde && antes.hasta === c.hasta ? antes : c))
    }
    documento.addEventListener('selectionchange', alCambiarLaSeleccion)
    return () => {
      documento.removeEventListener('selectionchange', alCambiarLaSeleccion)
    }
  }, [ref])
  const guardar = (pos: number) => {
    guardado.current = { desde: pos, hasta: pos }
    setCursor(guardado.current)
  }
  return { guardado, cursor, guardar }
}

// Vuelve a dibujar el DOM si no dice las partes de afuera (o cambió el contexto: los nombres) y pone el cursor pendiente.
function useDibujoDelCampo(
  ref: RefObject<HTMLDivElement | null>,
  a: Pick<Args, 'partes' | 'contexto'>,
  guardado: RefObject<Cursor | null>,
) {
  const dibujadas = useRef<readonly ParteDelTexto[]>([])
  const contextoDibujado = useRef<ContextoDePlantilla | null>(null)
  const pendiente = useRef<Pendiente | null>(null)
  useLayoutEffect(() => {
    const raiz = ref.current
    if (raiz === null) return
    const enElDom = normalizarPartes(leerPartes(raiz, dibujadas.current))
    if (!mismas(enElDom, a.partes) || contextoDibujado.current !== a.contexto) {
      const enfocado = raiz.ownerDocument.activeElement === raiz
      dibujar(raiz, a.partes, a.contexto)
      dibujadas.current = a.partes
      contextoDibujado.current = a.contexto
      if (enfocado && pendiente.current === null)
        ponerCursor(raiz, guardado.current?.desde ?? largoEnUnidades(a.partes))
    }
    const p = pendiente.current
    if (p === null) return
    pendiente.current = null
    if (p.enfocar) raiz.focus()
    if (raiz.ownerDocument.activeElement === raiz) ponerCursor(raiz, p.pos)
  })
  return {
    leer: (raiz: HTMLElement) => normalizarPartes(leerPartes(raiz, dibujadas.current)),
    pedir: (p: Pendiente) => {
      pendiente.current = p
    },
  }
}

export function useTextoConPastillas(a: Args) {
  const ref = useRef<HTMLDivElement>(null)
  const { guardado, cursor, guardar } = useCursorDelCampo(ref)
  const { leer, pedir } = useDibujoDelCampo(ref, a, guardado)
  const [, setPedido] = useState(0)
  const cursorDe = (raiz: HTMLElement, partes: readonly ParteDelTexto[]): Cursor => {
    const fin = largoEnUnidades(partes)
    return cursorEnUnidades(raiz) ?? guardado.current ?? { desde: fin, hasta: fin }
  }
  const cambiar = (r: PartesConCursor, deUnDato: boolean) => {
    pedir({ pos: r.pos, enfocar: false })
    guardar(r.pos)
    a.alCambiar(r.partes, deUnDato)
  }
  return {
    campoRef: ref,
    // El cursor en unidades (nulo si el campo nunca tuvo el foco): «Insertar dato» lo usa y se apaga con su motivo.
    cursor,
    // Lleva el foco al campo con el cursor en `pos` después del próximo dibujo («Listo», insertar una variable).
    enfocarEn: (pos: number) => {
      pedir({ pos, enfocar: true })
      guardar(pos)
      setPedido((n) => n + 1)
    },
    // Lo que el campo escucha.
    manejadores: {
      onInput: (e: FormEvent<HTMLDivElement>) => {
        a.alCambiar(leer(e.currentTarget), false)
      },
      onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[zy]$/i.test(e.key)) {
          e.preventDefault()
          if (e.key.toLowerCase() === 'y' || e.shiftKey) a.alRehacer()
          else a.alDeshacer()
          return
        }
        const partes = leer(e.currentTarget)
        const r = conLaTecla(e, partes, cursorDe(e.currentTarget, partes))
        if (r === null) return
        e.preventDefault()
        if ('mover' in r) ponerCursor(e.currentTarget, r.mover)
        else cambiar(r, r.deUnDato)
      },
      onPaste: (e: ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault()
        const texto = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')
        const partes = leer(e.currentTarget)
        const c = cursorDe(e.currentTarget, partes)
        cambiar(reemplazarConTexto(partes, c.desde, c.hasta, texto), false)
      },
      onDrop: (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
      },
      // Tocar una pastilla: el índice de su parte por su lugar en unidades (sobrevive a que el DOM no se haya vuelto a dibujar).
      onClick: (e: MouseEvent<HTMLDivElement>) => {
        const raiz = e.currentTarget
        const span = e.target instanceof Element ? e.target.closest('[data-parte]') : null
        if (span === null || !raiz.contains(span)) return
        const i = datoJuntoAlCursor(leer(raiz), unidadesAntesDe(raiz, span), 'despues')
        if (i !== null) a.alTocarDato(i)
      },
    },
  }
}

export type ManejadoresDelCampo = ReturnType<typeof useTextoConPastillas>['manejadores']
