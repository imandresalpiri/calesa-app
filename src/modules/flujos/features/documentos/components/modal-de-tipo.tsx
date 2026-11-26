'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { CampoParaQuien } from '@/shared/ui/campo-para-quien'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { QuienCambiaLosTipos } from '../../../entities/documentos/quien-cambia-los-tipos'
import type { ClaveDeGrupo, TipoDeDocumento } from '../../../entities/documentos/tipo-de-documento'
import {
  MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS,
  MOTIVO_SOLO_LECTURA_DEL_FLUJO,
  grupoDelTipo,
} from '../../../entities/documentos/vista-de-grupo'
import type { TipoCreado } from '../../configuracion/hooks/use-tipo-creado'
import { useFormularioDeTipo, type EscrituraDelModal } from '../hooks/use-formulario-de-tipo'
import { CamposDeFormatos } from './campos-de-formatos'
import { CamposDeTexto, ID_DEL_NOMBRE } from './campos-de-texto'
import { CamposDeVencimiento } from './campos-de-vencimiento'
import { Casilla } from './casilla'

// Al crear: el flujo que se ve, el nombre de su origen (nulo: el de repuestos), quién puede crear en cada grupo y con cuál empieza «Para».
export type CreacionDeTipo = {
  flujoId: string
  origen: string | null
  quien: QuienCambiaLosTipos
  inicial: ClaveDeGrupo
  alCrear: (tipo: TipoCreado) => void
}

type Props = {
  abierto: boolean
  alCerrar: () => void
  tipos: EscrituraDelModal
  // Nulo = «Nuevo tipo de documento» (con `creacion`).
  original: TipoDeDocumento | null
  creacion: CreacionDeTipo | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el tipo que se editaba).
  noDisponible: string | null
}

const ID_DEL_FORMULARIO = 'tipo-de-documento'
export const AVISO_DE_COMPARTIDO = 'Cambia para todos los orígenes que lo usan.'

function opcionesDePara(creacion: CreacionDeTipo) {
  return [
    {
      valor: 'origen' as const,
      etiqueta: creacion.origen ? `Sólo de ${creacion.origen}` : 'Sólo del flujo de repuestos',
      motivo: creacion.quien.propios ? null : MOTIVO_SOLO_LECTURA_DEL_FLUJO,
    },
    {
      valor: 'compartido' as const,
      etiqueta: 'Compartido con todos los orígenes',
      motivo: creacion.quien.compartidos ? null : MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS,
    },
  ]
}

// «Nuevo tipo de documento» (`?accion=nuevo-tipo&de=origen|compartido`) y «Editar» (`?accion=editar-tipo&tipo=<id>`): al crear, «Para» (sólo de este
// origen o compartido con todos); nombre, descripción, formatos, vencimiento con sus días, si se puede mostrar en el portal y, al editar, si está activo
// (un compartido avisa a quién le cambia). Ordenar se hace en la lista. El contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse
// mientras guarda, el conflicto con «Recargar») es de `ModalDeFormulario`. Quien lo monta le da una `key` por apertura: cada una empieza de cero, con un
// id de intento nuevo.
export function ModalDeTipo({ abierto, alCerrar, tipos, original, creacion, noDisponible }: Props) {
  const [para, setPara] = useState<ClaveDeGrupo>(creacion?.inicial ?? 'origen')
  const f = useFormularioDeTipo({
    tipos,
    original,
    para,
    flujoId: creacion?.flujoId ?? original?.flujoId ?? null,
    alCerrar,
    abierto,
    ...(creacion ? { alCrear: creacion.alCrear } : {}),
  })
  const { valores } = f

  return (
    <ModalDeFormulario
      id={ID_DEL_FORMULARIO}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}
      descripcion="Es lo que se le pide a quien sube un documento de este tipo."
      focoInicial={() => document.getElementById(ID_DEL_NOMBRE)}
      formulario={f}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear tipo', enCurso: 'Creando…' }
      }
    >
      <ParaOAviso
        creacion={original ? null : creacion}
        original={original}
        para={para}
        alCambiar={setPara}
        deshabilitado={f.enCurso}
      />
      <CamposDeTexto valores={valores} errores={f.errores} alEscribir={f.escribir} />
      <CamposDeFormatos
        valores={valores}
        error={f.errores['formatos']}
        alAlternar={f.alternarFormato}
      />
      <CamposDeVencimiento
        valores={valores}
        errores={f.errores}
        alElegirModo={f.elegirModo}
        alEscribir={f.escribir}
      />
      <CasillasDelTipo valores={valores} conActivo={original !== null} alEscribir={f.escribir} />
    </ModalDeFormulario>
  )
}

// Arriba del formulario: al crear, «Para» (sólo de este origen o compartido); al editar un compartido, a quién le cambia.
function ParaOAviso({
  creacion,
  original,
  para,
  alCambiar,
  deshabilitado,
}: {
  creacion: Props['creacion']
  original: Props['original']
  para: ClaveDeGrupo
  alCambiar: (para: ClaveDeGrupo) => void
  deshabilitado: boolean
}) {
  if (creacion) {
    return (
      <CampoParaQuien
        valor={para}
        alCambiar={alCambiar}
        opciones={opcionesDePara(creacion)}
        deshabilitado={deshabilitado}
      />
    )
  }
  return original && grupoDelTipo(original) === 'compartido' ? (
    <Aviso tono="info">{AVISO_DE_COMPARTIDO}</Aviso>
  ) : null
}

// Las casillas del final: si se puede mostrar en el portal y, al editar, si está activo.
function CasillasDelTipo({
  valores,
  conActivo,
  alEscribir,
}: {
  valores: ReturnType<typeof useFormularioDeTipo>['valores']
  conActivo: boolean
  alEscribir: ReturnType<typeof useFormularioDeTipo>['escribir']
}) {
  return (
    <>
      <Casilla
        id="visible-portal"
        etiqueta="Se puede mostrar en el portal"
        marcada={valores.visiblePortal}
        alCambiar={(marcada) => {
          alEscribir({ visiblePortal: marcada }, 'visible_portal_permitido')
        }}
        ayuda="Los documentos ya subidos y mostrados en el portal siguen mostrándose."
      />
      {conActivo ? (
        <Casilla
          id="activo"
          etiqueta="Activo"
          marcada={valores.activo}
          alCambiar={(marcada) => {
            alEscribir({ activo: marcada }, 'activo')
          }}
          ayuda="Uno desactivado sigue nombrando lo que ya lo usa y no se ofrece para lo nuevo."
        />
      ) : null}
    </>
  )
}
