'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { idDelCambio } from '../../../entities/actividad'
import { DetalleDelCambio } from '../../diff/components/detalle-del-cambio'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // `?cambio=` tal cual: un texto que no es un id dice «sin acceso».
  texto: string | null
}

// «Detalle del cambio» (`?cambio=<id>`): quién hizo qué y cuándo y todo lo que cambió, leído al abrirse por `actividad_diff`. Lo abre «Ver detalle»
// de una fila o un enlace (aunque el cambio no esté en lo cargado o sea más viejo). Sin acceso o inválido: «No tienes acceso a este cambio.». Sólo
// muestra. Al cerrarse sigue dibujando el último (el drawer se desliza con su contenido); otro cambio se lee de cero (`key`).
export function DrawerDelCambio({ abierto, alCerrar, texto }: Props) {
  const [ultimo, setUltimo] = useState(texto)
  if (texto !== null && texto !== ultimo) {
    setUltimo(texto)
  }
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Detalle del cambio">
      {ultimo === null ? null : (
        <DetalleDelCambio key={ultimo} id={idDelCambio(ultimo)} conCabecera />
      )}
    </Drawer>
  )
}
