'use client'

import type { QuienCambiaLosTipos } from '../../../entities/documentos/quien-cambia-los-tipos'
import { useTipoCreado } from '../../configuracion/hooks/use-tipo-creado'
import { useCrearTipo } from '../hooks/use-crear-tipo'
import { useModalDeNuevoTipo } from '../hooks/use-modal-de-nuevo-tipo'
import { ModalDeTipo } from './modal-de-tipo'

type Props = {
  // El origen del flujo que se ve, para «Sólo de Miami»; nulo: el flujo de repuestos.
  origen: string | null
  quien: QuienCambiaLosTipos
}

// «Nuevo tipo de documento» (`?accion=nuevo-tipo&de=origen|compartido`), montado una vez por el editor del flujo: lo abren el drawer de los tipos y
// «Crear tipo de documento» de un requisito, sin leer los grupos. Nace en el flujo abierto (`useTipoCreado().flujoId`) o compartido; al crearse, lo
// anuncia (el requisito lo elige) y la página se relee. Quien lo monta lo pide recién la primera vez que la URL lo abre (`useAbiertoAlgunaVez`).
export function CrearTipoDeDocumento({ origen, quien }: Props) {
  const nuevo = useModalDeNuevoTipo(quien)
  const tipos = useCrearTipo()
  const { flujoId, anunciar } = useTipoCreado()
  if (flujoId === null) {
    return null
  }
  return (
    <ModalDeTipo
      key={nuevo.apertura}
      abierto={nuevo.abierto}
      alCerrar={nuevo.cerrar}
      tipos={tipos}
      original={null}
      creacion={{ flujoId, origen, quien, inicial: nuevo.inicial, alCrear: anunciar }}
      noDisponible={null}
    />
  )
}
