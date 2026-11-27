import { connection } from 'next/server'
import { cache } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import {
  destinosFueraDeConfiguracion,
  type DestinoFueraDelNavegador,
} from '../destinos-de-busqueda'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from '../secciones'
import { destinosDeLosCatalogos } from './destinos-de-los-catalogos'
import { conOrigenesEnElMenu, subseccionesDeOrigenes } from './origenes-del-menu'

// Lo que el menú, el selector y el buscador de Configuración reciben: las secciones que esta persona puede abrir, con un sub-ítem por origen
// que abre (`origenes-del-menu.ts`). Una vez por request: quienes lo piden (el layout y la página de inicio) reciben el mismo arreglo y el
// payload lo manda una sola vez. Los orígenes salen de `getOrigenes(true)`, también en caché por request; si la lectura falla, sin sub-ítems.
export const gruposDeQuienMira = cache(async (): Promise<GrupoDelNavegador[]> => {
  await connection()
  const { permisos } = await requerirSesion()
  const grupos = paraElNavegador(gruposVisibles(permisos))
  const veOrigenes = grupos.some((grupo) => grupo.secciones.some((s) => s.clave === 'origenes'))
  if (!veOrigenes) {
    return grupos
  }
  const origenes = await getOrigenes(true)
  return origenes.ok
    ? conOrigenesEnElMenu(grupos, subseccionesDeOrigenes(origenes.data, permisos))
    : grupos
})

// Lo que el buscador encuentra y no es una sección de Configuración (Repuestos › Cotizador de repuestos, Orígenes › Miami › Fases › Puertos), según los
// permisos de quien mira. Una vez por request, como `gruposDeQuienMira`; si los orígenes no se pueden leer, sin sus catálogos.
export const destinosFueraDeQuienMira = cache(async (): Promise<DestinoFueraDelNavegador[]> => {
  await connection()
  const { permisos } = await requerirSesion()
  const origenes = await getOrigenes(true)
  return [
    ...(origenes.ok ? destinosDeLosCatalogos(origenes.data, permisos) : []),
    ...destinosFueraDeConfiguracion(permisos),
  ]
})
