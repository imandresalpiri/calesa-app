// Las líneas del «⋯» de una página en la tira de páginas (Carta y A4), en su orden: duplicar, mover antes, mover después y quitar. Lo que no
// se puede va apagado y una nota dice por qué (una sola vez si el motivo se repite: en sólo lectura, una). Puro: el componente le pone a cada
// línea lo que hace.
import type { MotivosDeLaPagina } from './paginas'

export type ClaveDelMenuDeLaPagina = 'duplicar' | 'mover-antes' | 'mover-despues' | 'quitar'

export type LineaDelMenuDeLaPagina =
  | {
      tipo: 'accion'
      clave: ClaveDelMenuDeLaPagina
      etiqueta: string
      deshabilitada: boolean
      destructiva?: true
    }
  | { tipo: 'separador'; clave: string }
  | { tipo: 'nota'; clave: string; texto: string }

export function lineasDeLaPagina(motivos: MotivosDeLaPagina): LineaDelMenuDeLaPagina[] {
  const acciones: [ClaveDelMenuDeLaPagina, string, string | null][] = [
    ['duplicar', 'Duplicar', motivos.duplicar],
    ['mover-antes', 'Mover antes', motivos.moverAntes],
    ['mover-despues', 'Mover después', motivos.moverDespues],
    ['quitar', 'Quitar', motivos.quitar],
  ]
  const lineas: LineaDelMenuDeLaPagina[] = acciones.map(([clave, etiqueta, motivo]) => ({
    tipo: 'accion',
    clave,
    etiqueta,
    deshabilitada: motivo !== null,
    ...(clave === 'quitar' ? { destructiva: true } : {}),
  }))
  lineas.splice(3, 0, { tipo: 'separador', clave: 'separador-de-quitar' })
  const notas = [...new Set(acciones.flatMap(([, , motivo]) => (motivo === null ? [] : [motivo])))]
  return [
    ...lineas,
    ...notas.map((texto, i): LineaDelMenuDeLaPagina => ({
      tipo: 'nota',
      clave: `nota-${String(i)}`,
      texto,
    })),
  ]
}
