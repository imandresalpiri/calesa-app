'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { createContext, use, useEffect, useEffectEvent } from 'react'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { ACCION_NUEVO_TIPO, CLAVE_DE_ACCION } from '../../../entities/panel-del-flujo'

// Un tipo de documento recién creado en esta pantalla: lo anuncia «Nuevo tipo de documento» al guardarse y lo elige el requisito que pidió crearlo.
export type TipoCreado = { id: string; nombre: string; flujoId: string | null }

// `flujoId`: el flujo abierto, donde nace un tipo «Sólo de <origen>». `anunciar` avisa a quienes se suscribieron (en el mismo evento del guardado, no
// en un efecto).
export type ContextoDelTipo = {
  flujoId: string | null
  anunciar: (tipo: TipoCreado) => void
  suscribir: (oyente: (tipo: TipoCreado) => void) => () => void
}

// Lo provee el flujo abierto (`flujo-abierto.tsx`); sin proveedor, nadie se entera de lo creado.
export const ContextoDelTipoCreado = createContext<ContextoDelTipo>({
  flujoId: null,
  anunciar: () => undefined,
  suscribir: () => () => undefined,
})

const PARAMETROS = {
  [CLAVE_DE_ACCION]: parseAsString,
  de: parseAsString,
  tipo: parseAsString,
}

// «Crear tipo de documento» desde donde haga falta (un requisito de documento, el drawer de los tipos): abre el modal que monta una vez el editor del flujo
// (`?accion=nuevo-tipo&de=origen`, sumado al historial: «atrás» lo cierra) sin cerrar la fase ni el drawer abiertos. Lo creado llega a `useAlCrearTipo`.
export function useTipoCreado() {
  const { flujoId, anunciar } = use(ContextoDelTipoCreado)
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const abierto = url[CLAVE_DE_ACCION] === ACCION_NUEVO_TIPO
  // Cerrado el modal con «atrás», el foco vuelve a quien lo abrió (el modal marca lo mismo: la clave es una).
  useVueltaDelFoco(CLAVE_DE_ACCION, abierto)
  return {
    flujoId,
    anunciar,
    abrirNuevo: (de: 'origen' | 'compartido' = 'origen') => {
      abrirConVuelta(
        CLAVE_DE_ACCION,
        () =>
          setUrl(
            { [CLAVE_DE_ACCION]: ACCION_NUEVO_TIPO, de, tipo: null },
            { history: 'push', scroll: false },
          ),
        abierto,
      )
    },
  }
}

// Lo que hace quien pidió el tipo cuando se crea (el requisito lo elige): se suscribe mientras está montado.
export function useAlCrearTipo(alCrear: (tipo: TipoCreado) => void) {
  const { suscribir } = use(ContextoDelTipoCreado)
  const avisar = useEffectEvent(alCrear)
  useEffect(
    () =>
      suscribir((tipo) => {
        avisar(tipo)
      }),
    [suscribir],
  )
}
