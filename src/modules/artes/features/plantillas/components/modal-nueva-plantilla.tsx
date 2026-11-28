'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { esClaveDeFormato, FORMATOS_DE_ARTE } from '../../../entities/formatos'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/nombres'
import type { OrigenDeArtes } from '../../../entities/tipos'
import {
  CAMPO_DEL_ALTO,
  CAMPO_DEL_ANCHO,
  CAMPO_DEL_FORMATO,
  CAMPO_DEL_NOMBRE,
  CAMPO_DEL_ORIGEN,
  useNuevaPlantilla,
} from '../hooks/use-nueva-plantilla'
import { CamposDeMedidas } from './campos-de-medidas'

type Props = {
  origenes: readonly OrigenDeArtes[]
  origenInicial: string
  alCerrar: () => void
}

const GRUPOS = (['imagen', 'pdf'] as const).map((tipo) => ({
  etiqueta: tipo === 'pdf' ? 'PDF' : 'Imagen',
  opciones: FORMATOS_DE_ARTE.filter((f) => f.tipo === tipo).map((f) => ({
    valor: f.clave,
    etiqueta:
      f.ancho === null || f.alto === null
        ? f.nombre
        : `${f.nombre} · ${String(f.ancho)} × ${String(f.alto)} ${f.unidad}`,
  })),
}))

// «Nueva plantilla» (`?panel=nueva`): el origen (los que quien mira ve), el formato (imagen o PDF) y el nombre, «Nueva plantilla» precargado.
// Ancho y alto están siempre a la vista: con un formato fijo muestran sus medidas apagadas; con «Personalizado» se escriben. Así elegir otro
// formato no mueve nada. Quien lo monta lo dibuja sólo mientras la URL lo pide: cada apertura empieza de cero.
export function ModalNuevaPlantilla({ origenes, origenInicial, alCerrar }: Props) {
  const formulario = useNuevaPlantilla({ origenInicial, alCerrar })
  return (
    <ModalDeFormulario
      id="nueva-plantilla-de-arte"
      abierto
      alCerrar={alCerrar}
      titulo="Nueva plantilla"
      descripcion="Elige dónde se usa y su medida. El diseño se arma después, en el editor."
      focoInicial={() => document.getElementById(CAMPO_DEL_NOMBRE)}
      formulario={formulario}
      guardar={{ etiqueta: 'Crear plantilla', enCurso: 'Creando…' }}
    >
      <Campo
        nombre={CAMPO_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribirNombre(evento.target.value)
        }}
        error={formulario.errores[CAMPO_DEL_NOMBRE]}
      />
      <CampoSeleccion
        nombre={CAMPO_DEL_ORIGEN}
        etiqueta="Origen"
        opciones={origenes
          .filter((o) => o.activo)
          .map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
        value={formulario.origenId}
        onChange={(evento) => {
          formulario.elegirOrigen(evento.target.value)
        }}
        error={formulario.errores[CAMPO_DEL_ORIGEN]}
      />
      <CampoSeleccion
        nombre={CAMPO_DEL_FORMATO}
        etiqueta="Formato"
        opciones={[]}
        grupos={GRUPOS}
        value={formulario.formato}
        onChange={(evento) => {
          if (esClaveDeFormato(evento.target.value)) {
            formulario.elegirFormato(evento.target.value)
          }
        }}
        error={formulario.errores[CAMPO_DEL_FORMATO]}
      />
      <CamposDeMedidas
        formulario={formulario}
        campos={{ ancho: CAMPO_DEL_ANCHO, alto: CAMPO_DEL_ALTO }}
      />
    </ModalDeFormulario>
  )
}
