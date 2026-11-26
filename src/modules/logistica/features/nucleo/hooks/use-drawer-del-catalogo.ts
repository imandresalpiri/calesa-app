'use client'

import { useMemo } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  compartidosTapadosEnElOrigen,
  filasDelCatalogo,
  MOTIVO_SIN_PERMISO_DE_CATALOGOS,
  textosDelCatalogo,
  type NombreDelCatalogo,
  type PropsDelCatalogoDelOrigen,
} from '../../../entities/nucleo/catalogo-del-origen'
import type { ContextoDeLasFilas } from '../components/acciones-del-catalogo'
import type { PanelesDelCatalogo } from './paneles-del-catalogo'
import { useCatalogoDelOrigen, type ConfigDelCatalogo } from './use-catalogo-del-origen'
import { useModalDelCatalogo } from './use-modal-del-catalogo'

type Fila = { id: string; origenId: string | null; activo: boolean }

type Args<T extends Fila> = PropsDelCatalogoDelOrigen & {
  config: ConfigDelCatalogo<T>
  paneles: PanelesDelCatalogo
  nombre: NombreDelCatalogo
  yaNoEsta: string
  // La clave con la que un propio tapa a un compartido (`claveDeCatalogo`, `claveDePuerto`).
  claveDe: (fila: T) => string
}

// Lo que comparte el drawer de cada catálogo de logística de un origen: la lectura de sus dos grupos, el modal por URL (que no abre sin permiso), si ya
// hay que montarlo y lo que cada fila necesita saber (los compartidos tapados y el motivo sin permiso).
export function useDrawerDelCatalogo<T extends Fila>({
  origen,
  puedeCambiar,
  config,
  paneles,
  nombre,
  yaNoEsta,
  claveDe,
}: Args<T>) {
  const datos = useCatalogoDelOrigen(config, origen.id)
  const catalogo = datos.lectura.tipo === 'listo' ? datos.lectura.catalogo : null
  const filas = useMemo(() => (catalogo ? filasDelCatalogo(catalogo) : null), [catalogo])
  const sinPermiso = puedeCambiar ? null : MOTIVO_SIN_PERMISO_DE_CATALOGOS
  const modal = useModalDelCatalogo(paneles, filas, yaNoEsta, sinPermiso)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const contexto = useMemo<ContextoDeLasFilas>(
    () => ({
      tapados: catalogo ? compartidosTapadosEnElOrigen(catalogo, origen.id, claveDe) : new Set(),
      tapado: textosDelCatalogo(nombre, origen.nombre).tapado,
      sinPermiso,
    }),
    [catalogo, origen.id, origen.nombre, claveDe, nombre, sinPermiso],
  )
  return { datos, modal, montar, contexto }
}
