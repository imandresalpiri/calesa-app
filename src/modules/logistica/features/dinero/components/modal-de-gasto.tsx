'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { Gasto } from '../../../entities/dinero/gasto'
import { MENSAJE_GASTO_YA_NO_ESTA } from '../../../entities/dinero/paneles'
import { useFormularioDeGasto } from '../hooks/use-formulario-de-gasto'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { CamposDeGasto } from './campos-de-gasto'

export type PropsDelModalDeGasto = {
  abierto: boolean
  alCerrar: () => void
  unidadId: string
  // El origen de la unidad: qué categorías usa.
  origenId: string
  // Nulo = «Registrar gasto». Se mira al montarse: el modal nace de nuevo en cada apertura.
  original: Gasto | null
  // El gasto que se corrige ya no está en la lista: lo escrito queda a la vista y no se guarda.
  perdido: boolean
  puedeGestionarCategorias: boolean
}

const ID = 'formulario-de-gasto'
const MIENTRAS_GUARDA = 'Guardando…'

/** `?panel=gasto&gasto=<id|nuevo>`: «Registrar gasto» y «Editar gasto» en un modal corto. Las categorías, monedas y tipos de cambio se leen al abrirse (los campos esperan apagados). */
export function ModalDeGasto(props: PropsDelModalDeGasto) {
  const { abierto, alCerrar, unidadId, origenId, perdido } = props
  // Qué se abrió, fijo mientras el modal se va (la URL se vacía antes de que termine de cerrarse).
  const [original] = useState(props.original)
  const editado = original === null ? null : (props.original ?? original)
  const lectura = useOpcionesDeGasto(abierto, 0, [origenId])
  const opciones = lectura.tipo === 'listo' ? lectura.opciones : null
  const f = useFormularioDeGasto({ unidadId, original: editado, opciones, alCerrar, abierto })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar gasto' : 'Registrar gasto'}
      descripcion="El equivalente en la moneda base lo calcula el sistema al guardar."
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={focoDeQuienAbrio}
      formulario={f}
      noDisponible={perdido ? MENSAJE_GASTO_YA_NO_ESTA : null}
      detalleDelConflicto="No se guardó nada. Recargar trae la versión de ahora y conserva lo que escribiste."
      guardar={{ etiqueta: original ? 'Guardar' : 'Registrar gasto', enCurso: MIENTRAS_GUARDA }}
    >
      {lectura.tipo === 'error' ? (
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
          <Button type="button" variant="outline" onClick={lectura.reintentar}>
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      <CamposDeGasto
        unidadId={unidadId}
        origenId={origenId}
        original={editado}
        opciones={opciones}
        formulario={f}
        puedeGestionarCategorias={props.puedeGestionarCategorias}
      />
    </ModalDeFormulario>
  )
}
