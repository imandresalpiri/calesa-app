'use client'

import { useMemo } from 'react'
import type { Diseno } from '../../../entities/diseno'
import { avisosDeDeduccion } from '../../../entities/diseno/aviso-de-deduccion'
import { campoDelRechazo } from '../../../entities/diseno/campo-del-rechazo'
import { deduccionesDelDiseno } from '../../../entities/diseno/deduccion'
import type { ContextoDeDiseno } from '../../../entities/validar-diseno'
import { motivoDeLaSeccionVacia, seccionVacia } from '../../../entities/diseno/insercion-del-diseno'
import { lugarDelRechazo } from '../../../entities/diseno/pieza-del-rechazo'
import type { Definicion } from '../../../entities/formula'
import { validarDiseno } from '../../../entities/validar-diseno'

type Args = {
  definicion: Definicion
  trabajo: Diseno
  contexto: ContextoDeDiseno
  nombresDeNodos: ReadonlyMap<string, string>
  nombresDeNiveles: ReadonlyMap<string, string>
}

// Lo que se revisa tras cada cambio del editor de la hoja: el primer rechazo de la base en espejo (`validarDiseno()`) con la pieza a la que apunta y su lugar
// legible; las frases de «se deduce restando»; y por qué no se guarda todavía (una sección vacía: se puede dejar mientras se arma, la base pide una pieza).
export function useRevisionDelDiseno({
  definicion,
  trabajo,
  contexto,
  nombresDeNodos,
  nombresDeNiveles,
}: Args) {
  const rechazo = useMemo(() => {
    const r = validarDiseno(definicion, trabajo, contexto)
    if (r.ok) return null
    const { regla, mensaje, donde, campo } = r.error
    const seccion = donde === undefined ? undefined : trabajo.secciones.find((s) => s.id === donde)
    const legible =
      donde === undefined
        ? null
        : (seccion?.titulo ??
          (seccion === undefined && donde === 'cabecera' ? 'la cabecera' : undefined) ??
          nombresDeNodos.get(donde) ??
          donde)
    return {
      regla,
      mensaje,
      donde: legible,
      // Un rechazo de forma del aspecto va también bajo su select.
      lugar: campoDelRechazo(campo, trabajo),
      enLaHoja: lugarDelRechazo(trabajo, r.error),
    }
  }, [definicion, trabajo, contexto, nombresDeNodos])
  const avisos = useMemo(
    () =>
      avisosDeDeduccion(deduccionesDelDiseno(definicion, trabajo), {
        nodos: nombresDeNodos,
        niveles: nombresDeNiveles,
      }),
    [definicion, trabajo, nombresDeNodos, nombresDeNiveles],
  )
  const vacia = seccionVacia(trabajo)
  return { rechazo, avisos, bloqueo: vacia === undefined ? null : motivoDeLaSeccionVacia(vacia) }
}

export type RechazoDelEditor = NonNullable<ReturnType<typeof useRevisionDelDiseno>['rechazo']>
