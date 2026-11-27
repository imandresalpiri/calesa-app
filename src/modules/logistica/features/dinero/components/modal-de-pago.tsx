'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { Modal } from '@/shared/ui/modal'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { Pago } from '../../../entities/dinero/pago'
import { MENSAJE_PAGO_YA_NO_ESTA } from '../../../entities/dinero/paneles-de-pago'
import { useFormularioDePago } from '../hooks/use-formulario-de-pago'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { CamposDePago } from './campos-de-pago'
import { LecturaDelPago } from './lectura-del-pago'

const SIN_ORIGENES: readonly string[] = []
const ID = 'formulario-de-pago'

export type PropsDelModalDePago = {
  abierto: boolean
  alCerrar: () => void
  // El vehículo o el proyecto de repuestos (lo dice el ámbito, `AmbitoDePagoContext`).
  unidadId: string
  // Nulo = «Registrar pago». Se mira al montarse: el modal nace de nuevo en cada apertura.
  original: Pago | null
  perdido: boolean
  // Sin `puedeEditar`, un pago existente se mira sin campos; sin `puedeConfirmar`, la lectura no ofrece «Anular pago».
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean }
  // «Anular pago» de la lectura de un confirmado: pasa al diálogo de anulación.
  alAnular: () => void
}

const MOTIVO_CONFIRMADO =
  'Un pago confirmado queda sellado. Para corregirlo, anúlalo y registra otro.'
const MOTIVO_SIN_PERMISO = 'No tienes permiso para corregir este pago.'
const YA_CONFIRMADO = 'Este pago ya está confirmado: queda sellado y no se corrige.'

// Un pago existente se edita sólo si está sin confirmar y quien mira puede editar; si no, se lee.
function soloSeLee(original: Pago | null, puedeEditar: boolean): boolean {
  return original !== null && (original.confirmado || !puedeEditar)
}

// Un pago en sólo lectura: el confirmado con su sello y, con la clave de confirmar, «Anular pago» (pide el motivo en su diálogo).
function ModalDeLecturaDelPago({
  abierto,
  alCerrar,
  unidadId,
  pago,
  puedeConfirmar,
  alAnular,
}: Omit<PropsDelModalDePago, 'original' | 'perdido' | 'permisos'> & {
  pago: Pago
  puedeConfirmar: boolean
}) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Pago"
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={focoDeQuienAbrio}
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar}>
            Cerrar
          </Button>
          {pago.confirmado && puedeConfirmar ? (
            <Button variant="outline" onClick={alAnular}>
              Anular pago
            </Button>
          ) : null}
        </>
      }
    >
      <LecturaDelPago
        unidadId={unidadId}
        pago={pago}
        motivo={pago.confirmado ? MOTIVO_CONFIRMADO : MOTIVO_SIN_PERMISO}
      />
    </Modal>
  )
}

function ModalDeFormularioDePago({
  abierto,
  alCerrar,
  unidadId,
  original,
  actual,
  perdido,
}: Pick<PropsDelModalDePago, 'abierto' | 'alCerrar' | 'unidadId' | 'perdido'> & {
  // Lo que se abrió (fijo) y su versión de ahora (llega con «Recargar»).
  original: Pago | null
  actual: Pago | null
}) {
  const lectura = useOpcionesDeGasto(abierto, 0, SIN_ORIGENES)
  const opciones = lectura.tipo === 'listo' ? lectura.opciones : null
  const f = useFormularioDePago({ unidadId, original: actual, opciones, alCerrar, abierto })
  const noDisponible = perdido ? MENSAJE_PAGO_YA_NO_ESTA : actual?.confirmado ? YA_CONFIRMADO : null
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar pago' : 'Registrar pago'}
      descripcion="El equivalente en la moneda base lo calcula el sistema al guardar."
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={focoDeQuienAbrio}
      formulario={f}
      noDisponible={noDisponible}
      detalleDelConflicto="No se guardó nada. Recargar trae la versión de ahora y conserva lo que escribiste."
      guardar={{ etiqueta: original ? 'Guardar' : 'Registrar pago', enCurso: 'Guardando…' }}
    >
      {lectura.tipo === 'error' ? (
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
          <Button type="button" variant="outline" onClick={lectura.reintentar}>
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      <CamposDePago unidadId={unidadId} original={actual} opciones={opciones} formulario={f} />
    </ModalDeFormulario>
  )
}

/**
 * `?panel=pago&pago=<id|nuevo>`: «Registrar pago» y «Editar pago» en un modal corto, o «Pago» en sólo lectura (confirmado, o sin permiso de editar). Lo mismo para un vehículo y
 * para un proyecto de repuestos (`AmbitoDePagoContext`). Qué se abrió queda fijo mientras el modal se va.
 */
export function ModalDePago(props: PropsDelModalDePago) {
  const [original] = useState(props.original)
  const [lectura] = useState(() => soloSeLee(props.original, props.permisos.puedeEditar))
  const actual = original === null ? null : (props.original ?? original)
  if (lectura && actual) {
    return (
      <ModalDeLecturaDelPago
        {...props}
        pago={actual}
        puedeConfirmar={props.permisos.puedeConfirmar}
      />
    )
  }
  return <ModalDeFormularioDePago {...props} original={original} actual={actual} />
}
