'use client'

import { avisar } from '@/shared/ui/toasts'
import {
  elegibles,
  hayLugar,
  MENSAJE_DEL_TOPE_DE_CAPAS,
} from '../../../entities/editor/acciones-de-capas'
import type { AccionDelEditor, HerramientaDelEditor } from '../../../entities/editor/atajos'
import { portapapelesDeLaSeleccion } from '../../../entities/editor/estado'
import {
  CLAVE_DEL_PORTAPAPELES,
  escribirPortapapeles,
  leerPortapapeles,
} from '../../../entities/editor/portapapeles'
import type { CamaraDelEditor, EditorDeArte, ManejoDelLienzo } from '../tipos'

export type ContextoDelTeclado = {
  editor: EditorDeArte
  lienzo: ManejoDelLienzo | null
  camara: CamaraDelEditor
  alElegirHerramienta: (herramienta: HerramientaDelEditor) => void
  alManoTransitoria: (activa: boolean) => void
  // Cuántas veces se pegó lo copiado: cada pegada se corre un poco más.
  pegadas: { vez: number }
}

const HERRAMIENTAS_DE_SOLO_LECTURA: ReadonlySet<HerramientaDelEditor> = new Set(['mover', 'mano'])
const nuevoId = () => crypto.randomUUID()

function leerLoCopiado() {
  try {
    return leerPortapapeles(localStorage.getItem(CLAVE_DEL_PORTAPAPELES))
  } catch {
    return null
  }
}

function copiar({ editor, pegadas }: ContextoDelTeclado) {
  const copiado = portapapelesDeLaSeleccion(editor.estado)
  if (copiado === null) {
    return
  }
  try {
    localStorage.setItem(CLAVE_DEL_PORTAPAPELES, escribirPortapapeles(copiado))
    pegadas.vez = 0
  } catch {
    // Sin almacenamiento no hay qué pegar después.
  }
}

function pegar({ editor, pegadas }: ContextoDelTeclado) {
  const copiado = leerLoCopiado()
  if (copiado === null || editor.soloLectura) {
    return
  }
  if (!hayLugar(editor.pagina, copiado.capas.length)) {
    avisar(MENSAJE_DEL_TOPE_DE_CAPAS)
    return
  }
  pegadas.vez += 1
  editor.despachar({ tipo: 'pegar', portapapeles: copiado, nuevoId, vez: pegadas.vez })
}

function duplicar({ editor }: ContextoDelTeclado) {
  const cuantas = editor.estado.seleccion.length
  if (cuantas === 0 || editor.soloLectura) {
    return
  }
  if (!hayLugar(editor.pagina, cuantas)) {
    avisar(MENSAJE_DEL_TOPE_DE_CAPAS)
    return
  }
  editor.despachar({ tipo: 'duplicar', nuevoId })
}

type Manejador<T extends AccionDelEditor['tipo']> = (
  contexto: ContextoDelTeclado,
  accion: Extract<AccionDelEditor, { tipo: T }>,
) => void

const MANEJADORES: { [T in AccionDelEditor['tipo']]: Manejador<T> } = {
  herramienta: (c, a) => {
    if (!c.editor.soloLectura || HERRAMIENTAS_DE_SOLO_LECTURA.has(a.herramienta)) {
      c.alElegirHerramienta(a.herramienta)
    }
  },
  'mano-transitoria': (c, a) => {
    c.alManoTransitoria(a.activa)
  },
  deshacer: (c) => {
    c.editor.despachar({ tipo: 'deshacer' })
  },
  rehacer: (c) => {
    c.editor.despachar({ tipo: 'rehacer' })
  },
  copiar,
  pegar,
  duplicar,
  quitar: (c) => {
    if (c.lienzo?.quitar() !== true) {
      c.editor.despachar({ tipo: 'quitar' })
    }
  },
  'elegir-todo': (c) => {
    const ids = elegibles(c.editor.pagina).map((capa) => capa.id)
    c.editor.despachar({ tipo: 'elegir', ids, modo: 'reemplazar' })
  },
  agrupar: (c) => {
    c.editor.despachar({ tipo: 'agrupar', nuevoId: nuevoId() })
  },
  desagrupar: (c) => {
    c.editor.despachar({ tipo: 'desagrupar' })
  },
  mover: (c, a) => {
    const ids = c.editor.estado.seleccion
    if (ids.length > 0) {
      c.editor.despachar({
        tipo: 'mover',
        ids,
        dx: a.dx,
        dy: a.dy,
        fusion: { clave: `flechas:${ids.join(',')}`, en: Date.now() },
      })
    }
  },
  ordenar: (c, a) => {
    c.editor.despachar({ tipo: 'ordenar', hacia: a.hacia })
  },
  ajustar: (c) => {
    c.camara.ajustar()
  },
  'al-cien': (c) => {
    c.camara.alCien()
  },
  enter: (c) => {
    c.lienzo?.enter()
  },
}

// Lo que hace cada atajo del editor (`accionDeLaTecla()` dice cuál): cambia el documento por `despachar`, la herramienta, la cámara o le
// pide algo al lienzo (Enter, Supr sobre un nodo de la pluma). En sólo lectura el reducer ya no deja cambiar nada.
export function ejecutarAccionDelTeclado(contexto: ContextoDelTeclado, accion: AccionDelEditor) {
  const manejar = MANEJADORES[accion.tipo] as Manejador<AccionDelEditor['tipo']>
  manejar(contexto, accion)
}
