'use client'

import { useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import { leerTablaParaEditarEnElNavegador } from '../../../areas/tablas/composicion.client'
import type { ColumnaDeTabla, FilaDeTabla } from '../../../entities/tabla-de-ayuda'
import { textoParaEditar } from '../../../entities/tablas/celda-tipeada'
import {
  abrirEdicion,
  aplicarFila,
  cancelarFila,
  editarFila,
  errorDeLaEdicion,
  hayCambiosEnLaAyuda,
  quitar,
  sumarAlFinal,
  tablaCambio,
  volver,
  type EdicionEnLaAyuda,
  type RechazoEnLaFila,
} from '../../../entities/tablas/edicion-en-la-ayuda'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'

// Lo que se pidió al tocar una fila antes de tener la tabla viva: se hace al llegar.
export type PedidoDeLaFila =
  { tipo: 'editar'; indice: number } | { tipo: 'quitar'; indice: number } | { tipo: 'sumar' }

// Por qué no se abrió: un fallo que se reintenta, o una tabla que sólo se edita en la configuración (más de 2.000 filas o una fila que no se lee).
export type SinAbrir = 'reintentar' | 'configuracion'

type Leida = { tabla: TablaDeReferencia; edicion: EdicionEnLaAyuda; cambio: boolean }

const textosDe = (
  columnas: readonly ColumnaDeTabla[],
  e: EdicionEnLaAyuda,
  filaId: string | null,
  locale: string,
): Record<string, string> => {
  const fila = e.estado.filas.find((f) => f.id === filaId)
  if (!fila) return {}
  const crudos = e.estado.crudos[fila.id] ?? {}
  return Object.fromEntries(
    columnas.map((c) => [
      c.clave,
      crudos[c.clave]?.texto ?? textoParaEditar(c, fila.valores[c.clave], locale),
    ]),
  )
}

// Lo pedido sobre la fila `indice` de las que mostraba la hoja. Si la tabla viva cambió desde que se abrió la hoja, ese índice ya no es la misma fila: sólo se abre la edición.
function hacer(pedido: PedidoDeLaFila, e: EdicionEnLaAyuda, cambio: boolean): EdicionEnLaAyuda {
  const id = (indice: number) => (cambio ? undefined : e.estado.filas[indice]?.id)
  switch (pedido.tipo) {
    case 'sumar': {
      const hecho = sumarAlFinal(e, crypto.randomUUID())
      return hecho.ok ? hecho.data : e
    }
    case 'editar': {
      const filaId = id(pedido.indice)
      return filaId === undefined ? e : editarFila(e, filaId)
    }
    case 'quitar': {
      const filaId = id(pedido.indice)
      return filaId === undefined ? e : quitar(e, filaId)
    }
  }
}

type ArgsDeLaEdicion = {
  tablaId: string
  // Las filas que dibujaba la hoja y si su lectura se cortó en el tope.
  mostradas: readonly FilaDeTabla[]
  cortada: boolean
  columnasDelBloque: readonly ColumnaDeTabla[]
}

const columnasVivas = (delBloque: readonly ColumnaDeTabla[], tabla: TablaDeReferencia) =>
  delBloque.flatMap((c) => tabla.columnas.filter((v) => v.clave === c.clave))

// La tabla viva, leída al primer pedido: lo pedido se hace al llegar.
function useLecturaDeLaEdicion(args: ArgsDeLaEdicion, alLeer: (leida: Leida) => void) {
  const [abriendo, setAbriendo] = useState<PedidoDeLaFila | null>(null)
  const [sinAbrir, setSinAbrir] = useState<SinAbrir | null>(null)
  async function abrir(pedido: PedidoDeLaFila | null) {
    setAbriendo(pedido ?? { tipo: 'sumar' })
    setSinAbrir(null)
    const leido = await leerTablaParaEditarEnElNavegador(args.tablaId)
    setAbriendo(null)
    if (!leido.ok) {
      const enLaConfiguracion =
        leido.error.codigo === 'regla' || leido.error.codigo === 'inesperado'
      setSinAbrir(enLaConfiguracion ? 'configuracion' : 'reintentar')
      return
    }
    const { tabla, filas } = leido.data
    const claves = columnasVivas(args.columnasDelBloque, tabla).map((c) => c.clave)
    const cambio = tablaCambio(args.mostradas, filas, claves, args.cortada)
    const inicial = abrirEdicion(filas)
    alLeer({ tabla, edicion: pedido ? hacer(pedido, inicial, cambio) : inicial, cambio })
  }
  return { abriendo, sinAbrir, abrir }
}

// La edición de una tabla desde la ayuda: la tabla viva se lee al primer ✎, 🗑 o «+ Añadir fila» (entera, ≤ 2.000 filas) y lo pedido se hace al llegar; después, una fila
// abierta a la vez con sus campos (lo tipeado vive aquí: «Guardar» lo aplica sin pedir «Listo»), las quitadas tachadas y el rechazo de la base en su celda. Se editan las
// columnas del bloque que la tabla viva todavía tiene.
export function useEdicionEnLaAyuda(args: ArgsDeLaEdicion) {
  const { locale } = useRegional()
  const [leida, setLeida] = useState<Leida | null>(null)
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [rechazo, setRechazo] = useState<RechazoEnLaFila | null>(null)
  const columnas = leida
    ? columnasVivas(args.columnasDelBloque, leida.tabla)
    : args.columnasDelBloque
  const { abriendo, sinAbrir, abrir } = useLecturaDeLaEdicion(args, (nueva) => {
    setRechazo(null)
    setLeida(nueva)
    setTextos(
      textosDe(
        columnasVivas(args.columnasDelBloque, nueva.tabla),
        nueva.edicion,
        nueva.edicion.editando,
        locale,
      ),
    )
  })

  function cambiar(edicion: EdicionEnLaAyuda) {
    setLeida((antes) => (antes ? { ...antes, edicion } : antes))
    setTextos(textosDe(columnas, edicion, edicion.editando, locale))
  }

  // Lo que se vería con lo tipeado en la fila abierta ya aplicado: con eso se sabe si hay cambios y es lo que «Guardar» publica.
  const aplicada = leida ? aplicarFila(leida.edicion, columnas, textos, locale) : null
  return {
    leida,
    columnas,
    abriendo,
    sinAbrir,
    textos,
    rechazo,
    cambios: aplicada !== null && hayCambiosEnLaAyuda(aplicada),
    error: leida && aplicada ? errorDeLaEdicion(leida.tabla.columnas, aplicada) : null,
    aplicada,
    // Con la tabla viva, el índice es el de sus filas (las quitadas también se dibujan). Lo tipeado en la fila abierta se aplica antes; si queda algo que no se lee,
    // esa fila sigue abierta con su motivo y no se abre otra ni se suma (🗑 sí: quitarla es una salida).
    pedir: (pedido: PedidoDeLaFila) => {
      if (!leida) {
        void abrir(pedido)
        return
      }
      const base = aplicada ?? leida.edicion
      cambiar(
        base.editando !== null && pedido.tipo !== 'quitar' ? base : hacer(pedido, base, false),
      )
    },
    // Tras un conflicto o un fallo: la tabla viva otra vez, sin lo editado.
    releer: () => void abrir(null),
    escribir: (clave: string, texto: string) => {
      setTextos((antes) => ({ ...antes, [clave]: texto }))
      setRechazo((antes) => (antes?.clave === clave ? null : antes))
    },
    listo: () => {
      if (aplicada) cambiar(aplicada)
    },
    cancelar: () => {
      if (leida) cambiar(cancelarFila(leida.edicion))
    },
    volver: (filaId: string) => {
      if (leida) cambiar(volver(leida.edicion, filaId))
    },
    // El rechazo de una celda al guardar: su fila abierta, con el mensaje en el campo.
    mostrarRechazo: (edicion: EdicionEnLaAyuda, enLaFila: RechazoEnLaFila) => {
      cambiar(edicion)
      setRechazo(enLaFila)
    },
    descartar: () => {
      setLeida(null)
      setTextos({})
      setRechazo(null)
    },
  }
}

export type EdicionEnLaAyudaEnUso = ReturnType<typeof useEdicionEnLaAyuda>
