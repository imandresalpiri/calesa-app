'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useMemo } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  TITULO_DE_AVISOS_DE_LA_PAGINA,
  avisosDeLaPagina,
  avisosDelRol,
  tituloDeAvisosDelRol,
} from '../../../entities/avisos-de-roles'
import { rolDominado } from '../../../entities/dominancia'
import type { RolConConcesiones } from '../../../entities/rol'

// Dos paneles por URL: los avisos de un rol (`?panel=avisos&rol=<id>`) y los de la página (`?panel=avisos` sin `rol`, o `?panel=avisos-de-la-pagina`).
// En el celular `rol` es el rol a la vista y siempre está: por eso el «!» de la página escribe el segundo y no borra el rol.
const PANEL_DE_AVISOS = 'avisos'
const PANEL_DE_AVISOS_DE_LA_PAGINA = 'avisos-de-la-pagina'

export type ContenidoDeAvisos = { titulo: string; avisos: string[]; deRol: boolean }

type Entrada = {
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
  puedeGestionar: boolean
  // En la tabla (≥ 768 px) `rol` no cambia nada a la vista; en el celular es el rol a la vista.
  enTabla: boolean
}

function contenidoDeLosAvisos(
  { misPermisos, puedeGestionar }: Entrada,
  delRol: RolConConcesiones | undefined,
  deLaPagina: boolean,
): ContenidoDeAvisos | null {
  if (delRol) {
    const avisos = avisosDelRol(delRol, {
      dominado: rolDominado(misPermisos, delRol.concesiones),
      puedeGestionar,
    })
    return avisos.length > 0
      ? { titulo: tituloDeAvisosDelRol(delRol.nombre), avisos, deRol: true }
      : null
  }
  return deLaPagina
    ? {
        titulo: TITULO_DE_AVISOS_DE_LA_PAGINA,
        avisos: avisosDeLaPagina(puedeGestionar),
        deRol: false,
      }
    : null
}

export type AvisosDeRoles = ReturnType<typeof useAvisosDeRoles>

// El modal de avisos de la matriz: qué muestra (null = cerrado), cómo se abre y se cierra. Un rol que no existe o sin avisos no lo abre y la
// URL se limpia. Al cerrar un rol abierto desde su columna en la tabla se quita el `rol` que se puso para abrirlo.
export function useAvisosDeRoles(entrada: Entrada) {
  const { roles, misPermisos, puedeGestionar, enTabla } = entrada
  const [{ rol, panel }, setParametros] = useQueryStates(
    { rol: parseAsString, panel: parseAsString },
    { shallow: false },
  )
  const delRol =
    panel === PANEL_DE_AVISOS && rol ? roles.find((candidato) => candidato.id === rol) : undefined
  const deLaPagina = panel === PANEL_DE_AVISOS_DE_LA_PAGINA || (panel === PANEL_DE_AVISOS && !rol)
  const contenido = useMemo(
    () => contenidoDeLosAvisos({ roles, misPermisos, puedeGestionar, enTabla }, delRol, deLaPagina),
    [roles, misPermisos, puedeGestionar, enTabla, delRol, deLaPagina],
  )
  const mostrado = useUltimo(contenido)
  const montar = useAbiertoAlgunaVez(contenido !== null)
  const sinNada = panel === PANEL_DE_AVISOS && rol !== null && contenido === null
  useEffect(() => {
    if (sinNada) {
      void setParametros({ panel: null })
    }
  }, [sinNada, setParametros])

  return {
    abierto: contenido !== null,
    montar,
    titulo: mostrado?.titulo ?? '',
    avisos: mostrado?.avisos ?? [],
    abrirDeUnRol: (rolId: string) => void setParametros({ panel: PANEL_DE_AVISOS, rol: rolId }),
    abrirDeLaPagina: () => void setParametros({ panel: PANEL_DE_AVISOS_DE_LA_PAGINA }),
    cerrar: () =>
      void setParametros(mostrado?.deRol && enTabla ? { panel: null, rol: null } : { panel: null }),
  }
}
