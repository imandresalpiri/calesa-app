'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Opciones } from '@/shared/ui/opciones'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/nombres'
import {
  CAMPO_DEL_ALTO_DESTINO,
  CAMPO_DEL_ANCHO_DESTINO,
  CAMPO_DEL_NOMBRE_DESTINO,
  useOtroFormato,
  type FuenteDelOtroFormato,
} from '../hooks/use-otro-formato'
import { CamposDeMedidas } from './campos-de-medidas'

type Props = {
  fuente: FuenteDelOtroFormato
  documento?: () => unknown
  alCerrar: () => void
}

// «Duplicar en otro formato» (`?panel=otro-formato&plantilla=<id>` en la lista, `?panel=otro-formato` en el editor): el formato destino entre
// los del mismo tipo, sus medidas siempre a la vista (`CamposDeMedidas`) y el nombre de la copia. La copia reacomoda cada elemento anclado a
// su centro y el texto conserva su tamaño. Quien lo monta lo dibuja sólo mientras la URL lo pide: cada apertura empieza de cero.
export function ModalOtroFormato({ fuente, documento, alCerrar }: Props) {
  const formulario = useOtroFormato({ fuente, ...(documento ? { documento } : {}), alCerrar })
  return (
    <ModalDeFormulario
      id="otro-formato-de-arte"
      abierto
      alCerrar={alCerrar}
      titulo="Duplicar en otro formato"
      descripcion={`Una copia de «${fuente.nombre}»: cada elemento se reacomoda y el texto conserva su tamaño.`}
      focoInicial={() => document.getElementById(CAMPO_DEL_NOMBRE_DESTINO)}
      formulario={formulario}
      guardar={{ etiqueta: 'Duplicar', enCurso: 'Duplicando…' }}
    >
      <Campo
        nombre={CAMPO_DEL_NOMBRE_DESTINO}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribirNombre(evento.target.value)
        }}
        error={formulario.errores[CAMPO_DEL_NOMBRE_DESTINO]}
      />
      <Opciones
        etiqueta="Formato"
        opciones={formulario.destinos.map((f) => ({ valor: f.clave, etiqueta: f.nombre }))}
        valor={formulario.formato}
        alCambiar={formulario.elegirFormato}
      />
      <CamposDeMedidas
        formulario={formulario}
        campos={{ ancho: CAMPO_DEL_ANCHO_DESTINO, alto: CAMPO_DEL_ALTO_DESTINO }}
      />
    </ModalDeFormulario>
  )
}
