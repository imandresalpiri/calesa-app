'use client'

import { useRef, useState } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'
import { tiposActivos } from '../../../entities/requisitos/vista-de-fase'
import {
  useAlCrearTipo,
  useTipoCreado,
  type TipoCreado,
} from '../../configuracion/hooks/use-tipo-creado'
import { useFormularioDeDocumento } from '../hooks/use-formulario-de-documento'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { CampoDeNotas } from './campo-de-notas'
import { CampoDeTipoDeDocumento } from './campo-de-tipo-de-documento'
import { CamposDeArchivos } from './campos-de-archivos'
import { PieDeFormulario } from './pie-de-formulario'

type Props = {
  requisitos: RequisitosDeLaFase
  alCerrar: () => void
}

// «Agregar requisito» de forma «Documento», en línea en el bloque del inspector: el tipo de documento (sólo los activos), cuántos archivos y en qué formatos
// (los del tipo) y las notas. Nace informativo. Si la lectura de los tipos falló o no hay tipos activos, no hay qué enviar. «Crear tipo de documento»
// abre su modal; lo creado se relee, queda elegido y se ofrece hasta que la lectura lo trae.
export function FormularioDeDocumento({ requisitos, alCerrar }: Props) {
  const { opciones, fallo, reintentar } = requisitos.opciones
  const [creado, setCreado] = useState<TipoCreado | null>(null)
  const { abrirNuevo } = useTipoCreado()
  const tipos = opciones === null ? null : conElCreado(tiposActivos(opciones.tipos), creado)
  const f = useFormularioDeDocumento({ requisitos, tipos: tipos ?? [], alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f
  const sinEnvio = fallo || tipos?.length === 0
  useAlCrearTipo((tipo) => {
    setCreado(tipo)
    reintentar()
    f.elegirTipo(tipo.id)
  })

  return (
    <form
      ref={referencia}
      aria-label="Agregar requisito de documento"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      {fallo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No pudimos leer los tipos de documento. Reintenta desde el aviso de arriba.
        </p>
      ) : (
        <CampoDeTipoDeDocumento
          tipos={tipos}
          valor={valores.tipoId}
          error={errores.tipo_documento_id}
          alElegir={f.elegirTipo}
          alCrear={() => {
            abrirNuevo()
          }}
          apagado={f.enCurso}
        />
      )}
      {sinEnvio ? null : (
        <>
          <CamposDeArchivos
            valores={valores}
            errores={errores}
            formatosDelTipo={tipos?.find((t) => t.id === valores.tipoId)?.formatos ?? null}
            motivoSinFormatos="Elige primero el tipo de documento."
            alEscribir={f.escribir}
          />
          <CampoDeNotas
            valor={valores.notas}
            error={errores.notas}
            alEscribir={(notas) => {
              f.escribir({ notas }, 'notas')
            }}
          />
        </>
      )}
      <PieDeFormulario
        aviso={f.aviso}
        enCurso={f.enCurso}
        etiqueta="Agregar requisito"
        etiquetaEnCurso="Agregando…"
        sinEnvio={sinEnvio}
        alCerrar={alCerrar}
      />
    </form>
  )
}

// El recién creado se ofrece hasta que la lectura lo trae (con sus formatos: hasta entonces, ninguno elegido de antemano).
function conElCreado(tipos: TipoParaRequisito[], creado: TipoCreado | null): TipoParaRequisito[] {
  if (creado === null || tipos.some((t) => t.id === creado.id)) {
    return tipos
  }
  return [
    ...tipos,
    {
      id: creado.id,
      nombre: creado.nombre,
      formatos: [],
      activo: true,
      delFlujo: creado.flujoId !== null,
      tapadoPor: null,
    },
  ]
}
