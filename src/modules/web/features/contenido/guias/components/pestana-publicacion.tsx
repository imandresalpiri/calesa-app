'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import type {
  EstadoDeGuia,
  GuiaCompleta,
  OpcionesDeGuia,
} from '../../../../entities/contenido/guias'
import type { ErroresDeGuia } from '../hooks/use-guardar-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'
import { BotonEliminarGuia } from './boton-eliminar-guia'
import { CamposDeDatos } from './campos-de-datos'
import { CamposSeo } from './campos-seo'
import { EstadoDeLaGuia } from './estado-de-la-guia'
import { ProgramarLaGuia } from './programar-la-guia'

export type PropsDePublicacion = {
  guia: GuiaCompleta
  estado: EstadoDeGuia
  ahora: string
  zona: string
  valores: ValoresDeGuia
  cambiar: (cambios: Partial<ValoresDeGuia>) => void
  errores: ErroresDeGuia
  opciones: OpcionesDeGuia
  deshabilitado: boolean
  // Por qué no se puede publicar (permiso, texto, red, un bloque que no vale), o nulo.
  motivo: string | null
  puedeProgramar: boolean
  alProgramar: (cuando: string) => void
  senalDeFoco: number
}

// La pestaña «Publicación» del panel: el estado y por qué no se puede publicar, programar, los datos de la guía, lo de los buscadores y eliminar.
// Todo a la vista, en una sola columna: ninguna sección se pliega ni lleva otra adentro.
export function PestanaPublicacion(props: PropsDePublicacion) {
  const { guia, estado, zona, valores, cambiar, errores } = props
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <EstadoDeLaGuia publicadaEn={guia.publicadaEn} ahora={props.ahora} zona={zona} />
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Actualizada el {formatearFecha(guia.actualizadoEn, { zona })}.
        </p>
        {estado === 'borrador' ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Los cambios se verán en la web al actualizar.
          </p>
        )}
        {props.motivo ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{props.motivo}</p>
        ) : null}
      </div>
      {props.puedeProgramar ? (
        <ProgramarLaGuia
          zona={zona}
          deshabilitado={props.deshabilitado}
          alProgramar={props.alProgramar}
          senalDeFoco={props.senalDeFoco}
        />
      ) : null}
      <CamposDeDatos
        valores={valores}
        cambiar={cambiar}
        errores={errores}
        opciones={props.opciones}
        deshabilitado={props.deshabilitado}
      />
      <CamposSeo valores={valores} cambiar={cambiar} errores={errores} />
      <BotonEliminarGuia />
    </div>
  )
}
