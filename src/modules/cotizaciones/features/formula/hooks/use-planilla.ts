'use client'

import { useId, useMemo, useState } from 'react'
import type { CambioDeLaUnidad } from '../../../entities/formula/escrito-en-la-celda'
import { unidadConElCambio } from '../../../entities/formula/escrito-en-la-celda'
import { filasALaVista, tramosALaVista } from '../../../entities/formula/filas-a-la-vista'
import { hojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import { UNIDAD_EN_CEROS, type UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import { ETIQUETA_DE_FILA_NUEVA } from '../../../entities/formula/insertar-fila'
import type {
  LecturaDeLaTarjetaEnVivo,
  NombradoPorLaTarjeta,
} from '../../../entities/tarjeta-en-vivo'
import type { FilaDeLaHoja } from '../../../entities/formula/hoja-de-la-planilla'
import type { TipoDeCelda } from '../../../entities/formula/tipo-de-celda'
import { idsDeLaEdicion } from '../components/planilla/ids-de-la-edicion'
import type { PropsDeLaPlanilla } from '../components/planilla/tipos'
import { useAccionesDeLaCuadricula } from './use-acciones-de-la-cuadricula'
import { useBandasDeLaPlanilla } from './use-bandas-de-la-planilla'
import { elegirTipo } from './elegir-tipo'
import { useCalculoDeLaPlanilla, type CalculoDeLaPlanilla } from './use-calculo-de-la-planilla'
import { useCamposDeLaFormula } from './use-campos-de-la-formula'
import { useCuadricula } from './use-cuadricula'
import type { EdicionConReferencias } from './use-edicion-con-referencias'
import { useEdicionDeLaPlanilla } from './use-edicion-de-la-planilla'
import { useFuncionEnLaBarra } from './use-funcion-en-la-barra'
import { useGuiaDeLaEdicion } from './use-guia-de-la-edicion'
import { useResultadoAlLado } from './use-resultado-al-lado'
import { useOperacionesDeFila, type OperacionesDeFila } from './use-operaciones-de-fila'
import { usePanelesDeLaPlanilla, type PanelesDeLaPlanilla } from './use-paneles-de-la-planilla'

export const idDeLaGrilla = (prefijo: string) => `${prefijo}-grilla`

const SIN_NOMBRAR: NombradoPorLaTarjeta = { nodos: [], grupos: [] }

const enCeros = (u: UnidadDeEjemplo) =>
  u === UNIDAD_EN_CEROS ||
  (Object.keys(u.inputs).length === 0 &&
    Object.keys(u.banderas).length === 0 &&
    Object.keys(u.vehiculo).length === 0 &&
    u.variante === undefined)

// Lo que la tarjeta de trabajo nombra (no se borra lo que usa); nulo si no se pudo leer (no se borra nada a ciegas).
function nombradoPor(t: LecturaDeLaTarjetaEnVivo): NombradoPorLaTarjeta | null {
  if (t.estado === 'lista') return t.nombra
  return t.estado === 'sin_tarjeta' ? SIN_NOMBRAR : null
}

// Las filas que se dibujan (búsqueda y tope; la que está en edición, siempre) en sus tramos, y la celda activa entre ellas.
function useFilasALaVista(hoja: ReturnType<typeof hojaDeLaPlanilla>, enEdicion: string | null) {
  const prefijo = useId()
  const [busqueda, setBusqueda] = useState('')
  const vista = useMemo(() => filasALaVista(hoja, busqueda, enEdicion), [hoja, busqueda, enEdicion])
  const buscando = busqueda.trim() !== ''
  const tramos = useMemo(
    () => tramosALaVista(vista.filas, buscando ? [] : hoja.gruposSinFilas),
    [vista.filas, buscando, hoja.gruposSinFilas],
  )
  const ids = useMemo(() => vista.filas.map((f) => f.id), [vista.filas])
  const cuadricula = useCuadricula({ ids, editando: enEdicion !== null, prefijo })
  return { prefijo, busqueda, setBusqueda, vista, tramos, cuadricula }
}

// La etiqueta del tipo de cambio de un bucket con el modo elegido (la nota de la cabecera de una banda).
function tipoDeCambioDeLa(editor: PropsDeLaPlanilla['editor'], calculo: CalculoDeLaPlanilla) {
  const deOmision = editor.trabajo.definicion.buckets ?? {}
  return (bucket: string) => {
    const id =
      calculo.delModo === undefined
        ? Object.hasOwn(deOmision, bucket)
          ? deOmision[bucket]
          : undefined
        : calculo.delModo.buckets.find((b) => b.bucket === bucket)?.nodo
    return id === undefined ? bucket : (calculo.dicho.nodos.get(id)?.etiqueta ?? id)
  }
}

// «Unidad de ejemplo: volver a ceros» y si «Totales» muestra el total en Bs.
function deLaUnidadYElTotal(p: PropsDeLaPlanilla) {
  const cabecera = p.diseno?.cabecera
  return {
    enCeros: enCeros(p.unidad),
    volverACeros: () => {
      p.alCambiarUnidad(UNIDAD_EN_CEROS)
    },
    verTotalBs: (cabecera?.ver_total_bs ?? false) && (cabecera?.ver_total_bs_por_defecto ?? false),
  }
}

type Cuadricula = ReturnType<typeof useFilasALaVista>['cuadricula']

type ArgsDelCierre = {
  edicion: EdicionConReferencias
  cuadricula: Cuadricula
  enfocar: () => void
  ops: OperacionesDeFila
  paneles: PanelesDeLaPlanilla
  calculo: CalculoDeLaPlanilla
}

// Aplicar (y, si entró, mover la activa como Enter o Tab) y descartar, con el foco de vuelta en la grilla; el tipo de celda y la banda nueva del menú de una fila.
function useCierreYMenu({ edicion, cuadricula, enfocar, ops, paneles, calculo }: ArgsDelCierre) {
  return {
    aplicarYSeguir: (tecla: 'Enter' | 'Tab' | null, shift = false, confirmaPisar = false) => {
      if (!edicion.aplicar(confirmaPisar)) return
      if (tecla !== null) cuadricula.moverCon(tecla, shift)
      enfocar()
    },
    descartar: () => {
      edicion.descartar()
      enfocar()
    },
    elegirTipo: (fila: FilaDeLaHoja, tipo: TipoDeCelda) => {
      elegirTipo(fila, tipo, {
        ops,
        edicion,
        paneles,
        cifra: calculo.cifras.get(fila.id),
        elegir: cuadricula.elegir,
      })
    },
    abrirNuevaBanda: (id: string) => {
      paneles.nuevaBanda.abrir({ con: id })
    },
  }
}

// Lo que ayuda a escribir en la barra de fórmula: `fx ▾` y la guía del renglón bajo la barra (la firma en el cursor, tocar una celda).
function useAyudasDeLaBarra(
  edicion: EdicionConReferencias,
  cuadricula: Cuadricula,
  textoDe: ReturnType<typeof useEdicionDeLaPlanilla>['textoDe'],
  prefijo: string,
) {
  return {
    funcion: useFuncionEnLaBarra({
      edicion,
      activa: cuadricula.activaElegida,
      textoDe,
      elegir: cuadricula.elegir,
      idDelTexto: idsDeLaEdicion(prefijo).texto,
    }),
    guia: useGuiaDeLaEdicion(edicion),
  }
}

// Lo que dibuja la planilla de la fórmula (D1–D21 del cambio de la planilla), armado sobre la fórmula de trabajo de la sesión: la hoja numerada, el cálculo con la
// unidad de ejemplo, la celda activa, la edición con referencias, las operaciones de fila y de banda, y los paneles.
export function usePlanilla(p: PropsDeLaPlanilla) {
  const { editor } = p
  const calculo = useCalculoDeLaPlanilla({
    editor,
    diseno: p.diseno,
    unidad: p.unidad,
    modo: p.modo,
  })
  const hoja = useMemo(() => hojaDeLaPlanilla(editor.trabajo), [editor.trabajo])
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [anuncio, setAnuncio] = useState('')
  const tarjeta = nombradoPor(p.tarjeta)
  const usos = useMemo(() => ({ diseno: p.diseno, tarjeta }), [p.diseno, tarjeta])
  const alCambiarUnidad = (cambio: CambioDeLaUnidad) => {
    p.alCambiarUnidad((u) => unidadConElCambio(u, cambio))
  }
  const ed = useEdicionDeLaPlanilla({ editor, hoja, calculo, unidad: p.unidad, alCambiarUnidad })
  const { edicion } = ed
  const filas = useFilasALaVista(hoja, edicion.edicion?.id ?? null)
  const { cuadricula } = filas
  // Por su id y no por un ref: la planilla viaja entera a sus piezas y un ref adentro no se lee al dibujar.
  const enfocar = () => {
    document.getElementById(idDeLaGrilla(filas.prefijo))?.focus()
  }
  const ops = useOperacionesDeFila({
    editor,
    hoja,
    usos,
    alCrear: (id, insertada) => {
      cuadricula.elegir({ id, col: insertada ? 'A' : 'C' })
      if (insertada)
        edicion.abrir(
          { id, col: 'A' },
          { en: 'celda', tipeado: ETIQUETA_DE_FILA_NUEVA, elegirTodo: true },
        )
    },
  })
  const acciones = useAccionesDeLaCuadricula({
    hoja,
    trabajo: editor.trabajo,
    unidad: p.unidad,
    edicion,
    ops,
    elegir: cuadricula.elegir,
    alCambiarUnidad,
    abrirMenu: () => {
      setMenuAbierto(true)
    },
    enfocar,
    anunciar: setAnuncio,
  })
  const paneles = usePanelesDeLaPlanilla()
  const cierre = useCierreYMenu({ edicion, cuadricula, enfocar, ops, paneles, calculo })
  return {
    ...filas,
    ...ed,
    editor,
    unidad: p.unidad,
    hoja,
    calculo,
    ops,
    acciones,
    ...useAyudasDeLaBarra(edicion, cuadricula, ed.textoDe, filas.prefijo),
    resultado: useResultadoAlLado({ edicion, editor, hoja, unidad: p.unidad, calculo }),
    bandas: useBandasDeLaPlanilla({ editor, conModos: calculo.modos.length > 0, tarjeta }),
    paneles,
    ...useCamposDeLaFormula(p.origen.id, editor.trabajo.definicion.nodos),
    menu: { abierto: menuAbierto, alCambiar: setMenuAbierto },
    anuncio,
    enfocar,
    alCambiarUnidad,
    ...cierre,
    tipoDeCambioDe: tipoDeCambioDeLa(editor, calculo),
    ...deLaUnidadYElTotal(p),
  }
}

export type Planilla = ReturnType<typeof usePlanilla>
