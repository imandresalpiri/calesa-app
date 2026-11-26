'use client'

import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { PedidoDeTipo } from '../../../../../entities/formula/tipo-de-celda'
import { useCamposDelOrigen } from '../../../hooks/use-campos-del-origen'
import { camposDelVehiculo, nombreDelCampo } from './campos-del-vehiculo'
import { MarcoDelTipo } from './marco-del-tipo'

type Props = {
  origen: { id: string; nombre: string }
  inicial: string
  motivo: string | null
  alAplicar: (pedido: PedidoDeTipo) => void
  alCancelar: () => void
}

// «Tipo de celda › Dato del vehículo»: las columnas comunes enseguida y las propias del origen al leerlas. Un campo que el origen no tiene (una copia de otro) se
// muestra igual, para no perderlo sin querer.
export function FormularioDelDato({ origen, inicial, motivo, alAplicar, alCancelar }: Props) {
  const uid = useId()
  const [campo, setCampo] = useState(inicial)
  const { lectura, reintentar } = useCamposDelOrigen(origen.id)
  const campos = camposDelVehiculo(
    lectura.estado === 'leido' ? lectura.dato.map((c) => c.clave) : [],
  )
  const deMas = inicial !== '' && !campos.includes(inicial) ? [inicial] : []
  const opciones = [
    { valor: '', etiqueta: 'Elige un dato', deshabilitada: true },
    ...[...campos, ...deMas].map((c) => ({ valor: c, etiqueta: nombreDelCampo(c) })),
  ]
  return (
    <MarcoDelTipo
      hayCambios={campo !== inicial}
      motivo={motivo}
      listo={campo !== ''}
      alEnviar={() => {
        alAplicar({ tipo: 'dato_del_vehiculo', campo })
      }}
      alCancelar={alCancelar}
    >
      <CampoSeleccion
        nombre={`${uid}-campo`}
        etiqueta="Dato del vehículo"
        ayuda="La hoja lo toma del vehículo elegido."
        opciones={opciones}
        value={campo}
        onChange={(e) => {
          setCampo(e.target.value)
        }}
      />
      {lectura.estado === 'leyendo' ? (
        <p aria-live="polite" className="text-(--color-ink-soft)">
          Leyendo los campos de {origen.nombre}…
        </p>
      ) : null}
      {lectura.estado === 'fallo' ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-(--color-ink-soft)">
          <p>No se pudieron leer los campos de {origen.nombre}.</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : null}
    </MarcoDelTipo>
  )
}
