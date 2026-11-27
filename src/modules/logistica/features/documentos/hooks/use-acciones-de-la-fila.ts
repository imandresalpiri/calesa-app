'use client'

import { createElement, type ReactNode } from 'react'
import { DownloadIcon, EyeIcon } from 'lucide-react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { lineasDelMenu, type LineaDelMenu } from '../../../entities/documentos/menu-del-documento'
import { abrirDocumento } from '../components/ver-documento'
import type { ContextoDeLaFila } from '../components/contexto-de-la-fila'
import { useEditarElDocumento } from './use-editar-el-documento'
import { useRevisarElDocumento } from './use-revisar-el-documento'

const icono = (tipo: typeof EyeIcon): ReactNode => createElement(tipo)

type Quehaceres = {
  revisar: () => void
  cambiarPortal: (visible: boolean) => void
}

// Una línea del «⋯» como acción de menú: las que abren algo encima (la vista previa, el modal de editar, el diálogo de eliminar) esperan a que el menú se cierre.
function deLectura(
  clave: 'ver' | 'descargar',
  linea: LineaDelMenu,
  documento: DocumentoDeLaUnidad,
  contexto: ContextoDeLaFila,
): AccionDeMenu {
  const nombre = documento.nombre ?? 'Documento sin nombre'
  if (clave === 'ver') {
    return {
      tipo: 'accion',
      clave: 'ver',
      etiqueta: linea.etiqueta,
      icono: icono(EyeIcon),
      principal: true,
      despuesDeCerrar: true,
      alElegir: () => {
        contexto.alVer(documento.id)
      },
    }
  }
  return {
    tipo: 'accion',
    clave: 'descargar',
    etiqueta: linea.etiqueta,
    icono: icono(DownloadIcon),
    alElegir: () => {
      if (documento.ruta !== null) void abrirDocumento(documento.ruta, nombre, 'descargar')
    },
  }
}

function comoAccion(
  linea: LineaDelMenu,
  documento: DocumentoDeLaUnidad,
  contexto: ContextoDeLaFila,
  hacer: Quehaceres,
): AccionDeMenu {
  const apagada = linea.estado === 'apagada'
  switch (linea.clave) {
    case 'ver':
    case 'descargar':
      return deLectura(linea.clave, linea, documento, contexto)
    case 'aprobar':
      return {
        tipo: 'accion',
        clave: 'aprobar',
        etiqueta: linea.etiqueta,
        deshabilitada: apagada,
        alElegir: hacer.revisar,
      }
    case 'rechazar':
      return {
        tipo: 'accion',
        clave: 'rechazar',
        etiqueta: linea.etiqueta,
        deshabilitada: apagada,
        despuesDeCerrar: true,
        alElegir: () => {
          contexto.alRechazar(documento.id)
        },
      }
    case 'portal':
      return {
        tipo: 'casilla',
        clave: 'portal',
        etiqueta: linea.etiqueta,
        marcada: linea.marcada ?? false,
        deshabilitada: apagada,
        cierra: true,
        alCambiar: hacer.cambiarPortal,
      }
    case 'editar':
      return {
        tipo: 'accion',
        clave: 'editar',
        etiqueta: linea.etiqueta,
        deshabilitada: apagada,
        despuesDeCerrar: true,
        alElegir: () => {
          contexto.alEditar(documento.id)
        },
      }
    case 'eliminar':
      return {
        tipo: 'accion',
        clave: 'eliminar',
        etiqueta: linea.etiqueta,
        destructiva: true,
        deshabilitada: apagada,
        despuesDeCerrar: true,
        alElegir: () => {
          contexto.alEliminar(documento.id)
        },
      }
  }
}

// El «⋯» de la fila de un documento: la lista única de sus acciones (`lineasDelMenu`), con el motivo escrito bajo la que está apagada (una vez por motivo) y «Eliminar» aparte, al final. Aprobar y
// «Visible en el portal» escriben desde aquí con la versión de la fila; un conflicto o un rechazo de la base quedan a la vista en la fila (`conflicto`, `error`).
export function useAccionesDeLaFila(
  documento: DocumentoDeLaUnidad,
  tipo: TipoDeDocumento | null,
  contexto: ContextoDeLaFila,
) {
  const revisando = useRevisarElDocumento(contexto.unidadId, documento)
  const editando = useEditarElDocumento(contexto.unidadId, documento)
  const hacer: Quehaceres = {
    revisar: () => void revisando.revisar('aprobado', null),
    cambiarPortal: (visible) => {
      void editando.editar(
        { visible_portal: visible },
        visible ? 'Ahora se ve en el portal.' : 'Ya no se ve en el portal.',
      )
    },
  }
  const acciones: AccionDeMenu[] = []
  const dichos = new Set<string>()
  for (const linea of lineasDelMenu(documento, tipo, contexto.claves)) {
    if (linea.clave === 'eliminar')
      acciones.push({ tipo: 'separador', clave: 'separador-eliminar' })
    acciones.push(comoAccion(linea, documento, contexto, hacer))
    if (linea.estado === 'apagada' && linea.motivo !== null && !dichos.has(linea.motivo)) {
      dichos.add(linea.motivo)
      acciones.push({ tipo: 'nota', clave: `nota-${linea.clave}`, texto: linea.motivo })
    }
  }
  return {
    acciones,
    conflicto: revisando.conflicto ?? editando.conflicto,
    error: revisando.error ?? editando.error,
    enCurso: revisando.enCurso || editando.enCurso,
  }
}
