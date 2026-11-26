'use client'

import type { Permisos } from '@/shared/lib/permisos'
import type { ReactNode } from 'react'
import {
  MODULO_DE_LOS_NIVELES,
  partesDelGrupo,
  type GrupoDePermisos,
  type OrigenDeLaMatriz,
} from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { EncabezadoRol } from './encabezado-rol'
import type { ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { NivelesDelRol } from './niveles-del-rol'
import { RenglonDelRol } from './renglon-del-rol'

type Props = {
  grupos: readonly GrupoDePermisos[]
  // El rol a la vista: en el celular la matriz se lee de a un rol (`?rol=`).
  columna: ColumnaDeRol
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  dominado: boolean
  alEliminar: () => void
  alAplicar: (cambio: CambioDeConcesion) => void
  niveles?: HuecosDeNivelesEnLaMatriz
  // El botón de «Quién crea y quién ve», bajo el título del bloque de cotizaciones.
  quienCrea?: ReactNode
}

// La matriz en el celular: un rol a la vez, y cada permiso es una fila con su nombre y su explicación y, debajo, el control del rol. Una
// tabla de dos columnas con textos y un interruptor pide más que los 412 px del celular con el texto al 200 % y deja el interruptor
// fuera de la vista (reflujo, WCAG 1.4.10; 5a-16): apilando, nada se desplaza de costado. Desde 768 px es la tabla (`MatrizDeRoles`).
export function ListaDelRol(props: Props) {
  const { grupos, columna, origenes, misPermisos, puedeGestionar, dominado, niveles, quienCrea } =
    props
  const { rol } = columna
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      <div className="min-w-0 border-b border-(--color-line) p-4">
        <EncabezadoRol
          rol={rol}
          puedeGestionar={puedeGestionar}
          dominado={dominado}
          alEliminar={props.alEliminar}
        />
      </div>
      {grupos.map((grupo) => (
        <section
          key={grupo.modulo}
          id={`bloque-${grupo.modulo}`}
          aria-label={grupo.titulo}
          className="min-w-0 scroll-mt-[calc(var(--topbar)+var(--alto-barra-rol,0px))]"
        >
          <h2 className="sticky top-[calc(var(--topbar)+var(--alto-barra-rol,0px))] z-10 bg-(--color-paper-dim) px-4 py-2 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)">
            {grupo.titulo}
          </h2>
          {grupo.modulo === MODULO_DE_LOS_NIVELES && quienCrea ? (
            <div className="px-4 py-1">{quienCrea}</div>
          ) : null}
          {partesDelGrupo(grupo, { conNiveles: niveles !== undefined }).map((parte, indice) =>
            parte.tipo === 'permisos' ? (
              <ul key={`permisos-${String(indice)}`} className="grid grid-cols-[minmax(0,1fr)]">
                {parte.permisos.map((permiso) => (
                  <RenglonDelRol
                    key={permiso.clave}
                    permiso={permiso}
                    columna={columna}
                    origenes={origenes}
                    misPermisos={misPermisos}
                    alAplicar={props.alAplicar}
                  />
                ))}
              </ul>
            ) : (
              <NivelesDelRol
                key={`niveles-${String(indice)}`}
                niveles={parte.niveles}
                huecos={niveles}
                columna={columna}
                origenes={origenes}
                misPermisos={misPermisos}
                alAplicar={props.alAplicar}
              />
            ),
          )}
        </section>
      ))}
    </div>
  )
}
