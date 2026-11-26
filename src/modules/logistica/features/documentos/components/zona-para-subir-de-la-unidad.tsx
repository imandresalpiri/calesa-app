'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { ordenarTiposParaElegir } from '../../../entities/documentos/admision'
import { tiposParaSubir } from '../../../entities/documentos/tipos-para-subir'
import { destinoDeLaUnidad } from '../../../entities/documentos/destino'
import { CLAVE_DEL_TIPO_A_SUBIR } from '../../../entities/nucleo/paneles-de-la-unidad'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePuedeSubirALaUnidad } from '../hooks/use-puede-subir-a-la-unidad'
import type { DatoDeDocumentos } from '../hooks/use-documentos-de-la-unidad'
import { ZonaParaSubir } from './zona-para-subir'

// La zona de subir de la unidad (6.06-2): los tipos con los que pide una fase primero y el permiso de subir del origen de la unidad, que sale de `mis_permisos` (la base vuelve a exigirlo).
// En el drawer de la página (`DrawerParaSubir`) va sin título y se cierra al terminar. Con `?tipo_documento=` (lo pone «Subir» de «Qué falta») la bandeja
// vacía arranca con ese tipo; un envío sin fallos lo quita (en el drawer, al cerrarse).
export function ZonaParaSubirDeLaUnidad({
  unidad,
  dato,
  conTitulo,
  alTerminar,
}: {
  unidad: Unidad
  dato: DatoDeDocumentos
  conTitulo?: boolean
  alTerminar?: () => void
}) {
  const puedeSubir = usePuedeSubirALaUnidad(unidad)
  const [tipoPedido, setTipoPedido] = useQueryState(CLAVE_DEL_TIPO_A_SUBIR, parseAsString)
  return (
    <ZonaParaSubir
      destino={destinoDeLaUnidad(unidad)}
      titulo="Subir documentos"
      tipos={ordenarTiposParaElegir(
        tiposParaSubir(dato.tipos, dato.requisitos),
        new Set(dato.requisitos.map((r) => r.tipoId)),
      )}
      puedeSubir={puedeSubir}
      tipoPedido={tipoPedido}
      alTerminar={alTerminar ?? (() => void setTipoPedido(null))}
      {...(conTitulo === undefined ? {} : { conTitulo })}
    />
  )
}
