'use client'

import { Aviso } from '@/shared/ui/aviso'
import { CampoParaQuien } from '@/shared/ui/campo-para-quien'
import {
  AVISO_DE_COMPARTIDO,
  textosDelCatalogo,
  type NombreDelCatalogo,
  type ParaDelCatalogo,
} from '../../../entities/nucleo/catalogo-del-origen'

type Props = {
  nombre: NombreDelCatalogo
  origen: string
  // Al crear: para quién (`alCambiar` lo cambia). Al editar, nulo.
  creando: { para: ParaDelCatalogo; alCambiar: (para: ParaDelCatalogo) => void } | null
  // Al editar: si la fila es compartida (avisa que cambia para todos).
  compartido: boolean
  deshabilitado?: boolean
}

// Lo primero del modal de un catálogo de logística: al crear, «Para» (sólo del origen o compartido con todos); al editar un compartido, el aviso de
// que el cambio vale para todos los orígenes que lo usan. Un propio que se edita no dice nada: es del origen.
export function ParaDelCatalogoEnElModal({
  nombre,
  origen,
  creando,
  compartido,
  deshabilitado,
}: Props) {
  if (creando !== null) {
    const textos = textosDelCatalogo(nombre, origen)
    return (
      <CampoParaQuien
        valor={creando.para}
        alCambiar={creando.alCambiar}
        opciones={[
          { valor: 'origen', etiqueta: textos.soloDelOrigen },
          { valor: 'compartido', etiqueta: textos.compartidoConTodos },
        ]}
        {...(deshabilitado === undefined ? {} : { deshabilitado })}
      />
    )
  }
  return compartido ? <Aviso tono="info">{AVISO_DE_COMPARTIDO}</Aviso> : null
}
