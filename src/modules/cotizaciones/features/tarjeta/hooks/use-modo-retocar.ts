'use client'

import { useMemo, useReducer, useState, type Dispatch } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import type {
  PlantillaEnCuadricula,
  RetoquesDeLaTarjeta,
} from '../../../entities/cuadricula-de-la-tarjeta'
import {
  aplicarRetoques,
  cuantosRetoques,
} from '../../../entities/tarjeta/retoques/aplicar-retoques'
import {
  MODO_INICIAL,
  modoDeRetoques,
  primerTextoLargo,
  type AccionDelModo,
} from '../../../entities/tarjeta/retoques/borrador-de-retoques'
import {
  falloDelModo,
  NO_SE_GUARDO,
  type FalloDelModo,
} from '../../../entities/tarjeta/retoques/fallo-del-modo'
import {
  mismosRetoques,
  retoquesParaGuardar,
} from '../../../entities/tarjeta/retoques/para-guardar'
import { validarRetoques } from '../../../entities/tarjeta/retoques/validar-retoques'
import { retocarLaTarjeta } from '../actions/retocar-la-tarjeta'

// Lo que la página sabe de los retoques de una guardada (`DatosDeLaPagina.retoque`): los guardados, la versión de la cotización y si quien mira la puede
// guardar (`puede_guardar` de la base). La hoja nueva no lo pasa: no hay «Retocar».
export type RetoqueDeLaPagina = {
  retoques: RetoquesDeLaTarjeta | null
  actualizadoEn: string
  puedeRetocar: boolean
}

type EnvioDelModo =
  | { tipo: 'quieto' }
  | { tipo: 'enviando' }
  // Entró: los controles quedan apagados hasta que llega la página con la versión nueva (la hoja se vuelve a montar por su `key`).
  | { tipo: 'guardado'; esperado: string }
  | { tipo: 'recargando' }
  | { tipo: 'error'; fallo: FalloDelModo; pedido: RetoquesDeLaTarjeta | null }

export type ModoRetocar = ReturnType<typeof useModoRetocar>

// El estado del modo (el borrador y lo elegido): lo crea la vista previa antes que el modelo de la tarjeta, que dibuja el borrador.
export const useEstadoDelModo = () => useReducer(modoDeRetoques, MODO_INICIAL)

// Lo que cambia el borrador sin ir a la base.
const accionesDelBorrador = (despachar: Dispatch<AccionDelModo>) => ({
  elegirCelda: (id: string) => {
    despachar({ tipo: 'elegir_celda', id })
  },
  escribir: (id: string, texto: string) => {
    despachar({ tipo: 'escribir', id, texto })
  },
  dejar: () => {
    despachar({ tipo: 'dejar' })
  },
  cancelarCampo: () => {
    despachar({ tipo: 'cancelar_campo' })
  },
  elegirFila: (id: string, celda?: string) => {
    despachar({ tipo: 'elegir_fila', id, ...(celda === undefined ? {} : { celda }) })
  },
  alternarFila: (id: string) => {
    despachar({ tipo: 'alternar_fila', id })
  },
})

// El envío a la base («Listo» y «Volver a la plantilla») y lo que pasa después: el aviso si entró, el fallo (y lo elegido de su `donde`) si no.
function useEnvioDelModo({
  cotizacionId,
  actualizadoEn,
  despachar,
}: {
  cotizacionId: string | null
  actualizadoEn: string
  despachar: Dispatch<AccionDelModo>
}) {
  const [envio, setEnvio] = useState<EnvioDelModo>({ tipo: 'quieto' })
  const [confirmandoVolver, setConfirmandoVolver] = useState(false)

  function fallar(fallo: FalloDelModo, pedido: RetoquesDeLaTarjeta | null) {
    setConfirmandoVolver(false)
    setEnvio({ tipo: 'error', fallo, pedido })
    const donde = fallo.tipo === 'regla' ? fallo.donde : null
    if (donde?.tipo === 'celda') despachar({ tipo: 'elegir_celda', id: donde.id })
    if (donde?.tipo === 'fila') despachar({ tipo: 'elegir_fila', id: donde.id })
  }

  async function enviar(retoques: RetoquesDeLaTarjeta | null) {
    if (cotizacionId === null) return
    setEnvio({ tipo: 'enviando' })
    const r = await enviarAccion(
      retocarLaTarjeta({ cotizacionId, actualizadoEnEsperado: actualizadoEn, retoques }),
      NO_SE_GUARDO,
    )
    if (!r.ok) {
      fallar(falloDelModo(r.error, 'sinRed' in r), retoques)
      return
    }
    setConfirmandoVolver(false)
    if (r.data.repetido) {
      setEnvio({ tipo: 'quieto' })
      despachar({ tipo: 'salir' })
      return
    }
    avisarExito(retoques === null ? 'La tarjeta volvió a la plantilla.' : 'Tarjeta retocada.')
    setEnvio({ tipo: 'guardado', esperado: actualizadoEn })
  }

  // La versión nueva llegó sin volver a montar la vista previa: el modo termina.
  if (envio.tipo === 'guardado' && envio.esperado !== actualizadoEn) {
    setEnvio({ tipo: 'quieto' })
    despachar({ tipo: 'salir' })
  }

  return {
    envio,
    confirmandoVolver,
    setConfirmandoVolver,
    reiniciar: () => {
      setEnvio({ tipo: 'quieto' })
      setConfirmandoVolver(false)
    },
    fallar,
    enviar,
    reintentar: () => {
      if (envio.tipo === 'error') void enviar(envio.pedido)
    },
    // Tras un PT409 o sin permiso, quien recarga la página (la hoja se vuelve a montar y el modo termina) apaga antes los controles.
    recargando: () => {
      setEnvio({ tipo: 'recargando' })
    },
  }
}

// Lo guardado que aplica a la cuadrícula de hoy, lo que se mandaría y si difieren (un texto con datos se compara con su texto resuelto, `resueltos`).
function useCambiosDelModo(
  plantilla: PlantillaEnCuadricula | null,
  resueltos: ReadonlyMap<string, string>,
  guardados: RetoquesDeLaTarjeta | null,
  modo: ReturnType<typeof modoDeRetoques>,
) {
  const delGuardado = useMemo(
    () =>
      plantilla === null
        ? { aplican: null, noAplican: cuantosRetoques(guardados) }
        : aplicarRetoques(plantilla, guardados),
    [plantilla, guardados],
  )
  const paraGuardar = useMemo(
    () => (plantilla === null ? null : retoquesParaGuardar(modo.borrador, plantilla, resueltos)),
    [plantilla, resueltos, modo.borrador],
  )
  const hayCambios =
    modo.retocando &&
    plantilla !== null &&
    !mismosRetoques(paraGuardar, retoquesParaGuardar(delGuardado.aplican, plantilla, resueltos))
  return { delGuardado, paraGuardar, hayCambios }
}

// El modo «Retocar» de la vista previa de una guardada: el borrador (de los guardados que aplican), lo elegido, si hay cambios, el envío y sus fallos. Vive en
// la vista previa (que ya es diferida): su interfaz se pide aparte, al empezar. `plantilla` es la cuadrícula que se dibuja, sin retocar (nula: la tarjeta por
// omisión, sin textos); `resueltos`, el texto resuelto de cada texto con datos (`textosConDatosResueltos()`).
export function useModoRetocar({
  estado,
  cotizacionId,
  retoque,
  plantilla,
  resueltos,
}: {
  // El del reductor (`useEstadoDelModo()`): va aparte porque el modelo de la tarjeta dibuja el borrador y el modo necesita la plantilla que lee el modelo.
  estado: ReturnType<typeof useEstadoDelModo>
  cotizacionId: string | null
  retoque: RetoqueDeLaPagina | undefined
  plantilla: PlantillaEnCuadricula | null
  resueltos: ReadonlyMap<string, string>
}) {
  const [modo, despachar] = estado
  const guardados = retoque?.retoques ?? null
  const envio = useEnvioDelModo({
    cotizacionId,
    actualizadoEn: retoque?.actualizadoEn ?? '',
    despachar,
  })
  const { delGuardado, paraGuardar, hayCambios } = useCambiosDelModo(
    plantilla,
    resueltos,
    guardados,
    modo,
  )

  function listo() {
    if (!hayCambios || plantilla === null) {
      envio.reiniciar()
      despachar({ tipo: 'salir' })
      return
    }
    const revisados = validarRetoques(paraGuardar, plantilla)
    if (revisados.ok) {
      void envio.enviar(paraGuardar)
      return
    }
    const { mensaje, donde } = revisados.error
    envio.fallar(falloDelModo({ codigo: 'validacion', mensaje, causa: donde }, false), paraGuardar)
  }

  const { tipo } = envio.envio
  return {
    ...accionesDelBorrador(despachar),
    retocando: modo.retocando,
    borrador: modo.borrador,
    elegida: modo.elegida,
    hayCambios,
    textoLargo: modo.retocando ? primerTextoLargo(modo.borrador) : null,
    noAplican: delGuardado.noAplican,
    hayGuardados: guardados !== null,
    enCurso: tipo === 'enviando' || tipo === 'guardado' || tipo === 'recargando',
    fallo: envio.envio.tipo === 'error' ? envio.envio.fallo : null,
    confirmandoVolver: envio.confirmandoVolver,
    empezar: () => {
      envio.reiniciar()
      despachar({ tipo: 'empezar', aplican: delGuardado.aplican })
    },
    salir: () => {
      envio.reiniciar()
      despachar({ tipo: 'salir' })
    },
    listo,
    pedirVolver: () => {
      envio.setConfirmandoVolver(true)
    },
    seguirRetocando: () => {
      envio.setConfirmandoVolver(false)
    },
    volverALaPlantilla: () => {
      void envio.enviar(null)
    },
    reintentar: envio.reintentar,
    recargando: envio.recargando,
  }
}
