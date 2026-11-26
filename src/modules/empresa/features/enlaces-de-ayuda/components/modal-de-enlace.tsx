'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import {
  LARGO_MAXIMO_DE_LA_DESCRIPCION,
  LARGO_MAXIMO_DE_LA_URL,
  LARGO_MAXIMO_DEL_TITULO,
} from '../../../entities/enlaces-de-ayuda'
import type { FormularioDeEnlace } from '../hooks/use-formulario-de-enlace'

type Props = {
  // El prefijo de los ids (`<prefijo>-titulo`…): el de la empresa y el propio no chocan.
  prefijo: string
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion: string
  formulario: FormularioDeEnlace
  noDisponible: string | null
  guardar: { etiqueta: string; enCurso: string }
}

// El modal de un enlace de ayuda: título, dirección (`https://`) y descripción opcional. El contrato del modal (preguntar antes de cerrar con
// algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar» que conserva lo tipeado) es de `ModalDeFormulario`. Quien lo monta le
// da una `key` por apertura: cada una empieza de lo guardado.
export function ModalDeEnlace({
  prefijo,
  abierto,
  alCerrar,
  titulo,
  descripcion,
  formulario,
  noDisponible,
  guardar,
}: Props) {
  const { tipeado, errores, escribir } = formulario
  return (
    <ModalDeFormulario
      id={prefijo}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      descripcion={descripcion}
      focoInicial={() => document.getElementById(`${prefijo}-titulo`)}
      focoAlCerrar={() => false}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={guardar}
    >
      <Campo
        nombre={`${prefijo}-titulo`}
        etiqueta="Título"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_TITULO + 20}
        value={tipeado.titulo}
        onChange={(evento) => {
          escribir('titulo', evento.target.value)
        }}
        error={errores.titulo}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_TITULO)} caracteres.`}
      />
      <Campo
        nombre={`${prefijo}-url`}
        etiqueta="Dirección"
        inputMode="url"
        autoComplete="off"
        placeholder="https://"
        maxLength={LARGO_MAXIMO_DE_LA_URL + 20}
        value={tipeado.url}
        onChange={(evento) => {
          escribir('url', evento.target.value)
        }}
        error={errores.url}
        ayuda="Empieza con https://. Se abre en otra pestaña."
      />
      <Campo
        nombre={`${prefijo}-descripcion`}
        etiqueta="Descripción (opcional)"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_LA_DESCRIPCION + 20}
        value={tipeado.descripcion}
        onChange={(evento) => {
          escribir('descripcion', evento.target.value)
        }}
        error={errores.descripcion}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DE_LA_DESCRIPCION)} caracteres.`}
      />
    </ModalDeFormulario>
  )
}
