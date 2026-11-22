'use client'

import { MasAcciones } from '@/shared/ui/lista'
import { avisosDelRol, tituloDeAvisosDelRol } from '../../../entities/avisos-de-roles'
import { motivoDeNoEliminar, personasConElRol, type RolConConcesiones } from '../../../entities/rol'
import { BotonDeAvisos } from './boton-de-avisos'
import { RoleBadge } from './role-badge'

type Props = {
  rol: RolConConcesiones
  // La persona gestiona roles (si no, no hay nada que ofrecerle).
  puedeGestionar: boolean
  // Domina este rol: cada permiso que el rol tiene, ella también.
  dominado: boolean
  alEliminar: () => void
  // Abre «Avisos de <rol>». Sin él, la cabecera no lleva el «!» (en el celular está en la barra «Rol a la vista»).
  alAvisos?: () => void
}

// La cabecera de la columna de un rol: quién es, cuántas personas lo tienen, si tiene avisos el «!» que los abre y su «⋯» («Más acciones de <rol>») con «Eliminar el rol…»
// (apagada con su motivo). Su única acción es destructiva: la cabecera no abre nada al tocarla.
export function EncabezadoRol({ rol, puedeGestionar, dominado, alEliminar, alAvisos }: Props) {
  const motivo = motivoDeNoEliminar(rol, dominado)
  const avisos = avisosDelRol(rol, { dominado, puedeGestionar })

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 py-1 font-normal md:min-w-36">
      <div className="flex items-center gap-1">
        <RoleBadge rol={rol} className="min-w-0" />
        {alAvisos && avisos.length > 0 ? (
          <BotonDeAvisos
            titulo={tituloDeAvisosDelRol(rol.nombre)}
            cantidad={avisos.length}
            alAbrir={alAvisos}
            className="shrink-0"
          />
        ) : null}
        {puedeGestionar ? (
          <MasAcciones
            nombre={rol.nombre}
            acciones={[
              {
                tipo: 'accion',
                clave: 'eliminar',
                etiqueta: 'Eliminar el rol…',
                destructiva: true,
                deshabilitada: motivo !== null,
                alElegir: alEliminar,
              },
              ...(motivo === null
                ? []
                : ([{ tipo: 'nota', clave: 'motivo', texto: motivo }] as const)),
            ]}
          />
        ) : null}
      </div>
      <span className="text-(length:--text-xs) text-(--color-ink-faint)">
        {personasConElRol(rol.personas)}
      </span>
    </div>
  )
}
