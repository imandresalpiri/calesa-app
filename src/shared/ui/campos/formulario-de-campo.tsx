'use client'

import { useRef } from 'react'
import { nombresDeGrupo, type CampoBase } from '@/shared/lib/campos'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { AvisosDelFormulario } from './avisos-del-formulario'
import { CamposDeCampo } from './campos-de-campo'
import { PieDelFormulario } from './pie-del-formulario'
import type { ConfiguracionDeCampos, EdicionesDeCampos, ErroresDeCampo } from './tipos'
import { useBorradorDelCampo } from './use-borrador-del-campo'
import { useFormularioDeCampo } from './use-formulario-de-campo'

export type PropsDelFormulario<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // null = un campo nuevo.
  campo: Campo | null
  todos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  // `&eliminar=1`: al abrir, cuenta y muestra el aviso de eliminar.
  eliminar: boolean
  // Trae lo guardado (otra persona guardó este campo); lo escrito queda.
  alRecargar: () => void
  alCerrar: () => void
}

type ErroresDeValidacion = Partial<Record<string, string[]>> | undefined

// Los errores de una validación del servidor, junto a los que arma el formulario (un nombre repetido).
function erroresDelFormulario(
  propios: ErroresDeCampo,
  validacion: ErroresDeValidacion,
): ErroresDeCampo {
  const delServidor = (campo: string) => errorDeCampo(validacion, campo)
  return {
    ...propios,
    etiqueta: propios.etiqueta ?? delServidor('etiqueta'),
    opciones: propios.opciones ?? delServidor('opciones'),
    grupo: propios.grupo ?? delServidor('grupo'),
    valorDefecto: propios.valorDefecto ?? delServidor('valorDefecto'),
    minimo: propios.minimo ?? delServidor('minimo'),
    maximo: propios.maximo ?? delServidor('maximo'),
  }
}

// Crear o editar un campo. Los cambios que pueden tocar datos ya cargados (cambiar el tipo,
// volverlo requerido, sacar una opción) cuentan primero y muestran su aviso acá mismo.
export function FormularioDeCampo<Campo extends CampoBase, Cambios extends object, Nuevo>(
  props: PropsDelFormulario<Campo, Cambios, Nuevo>,
) {
  const { campo, todos, puedeGestionar, configuracion, ediciones, eliminar, alCerrar } = props
  const formulario = useRef<HTMLFormElement>(null)
  const estado = useFormularioDeCampo({
    campo,
    todos,
    configuracion,
    ediciones,
    eliminarAlAbrir: eliminar && puedeGestionar,
    alTerminar: alCerrar,
  })
  const borrador = useBorradorDelCampo({
    clave: `${configuracion.textos.borrador}-${campo?.id ?? 'nuevo'}`,
    formulario,
    nombres: ['etiqueta', 'grupo', ...configuracion.textosLibres],
    activo: puedeGestionar,
  })
  // Un aviso que sale de la pantalla («Abrir ficha») con algo escrito pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(puedeGestionar && estado.hayCambios, borrador.limpiar)
  const puedeEliminar = puedeGestionar && campo !== null && !campo.esSistema

  async function enviar() {
    const hecho = await estado.enviar()
    if (hecho) {
      // Lo tipeado ya está en la base: un borrador que sobrevive reaparecería como «recuperado»
      // si otra persona cambia el campo después.
      borrador.limpiar()
    } else {
      enfocarPrimerError(formulario.current)
    }
  }

  return (
    <form
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar()
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">{campo ? `Campo ${campo.etiqueta}` : 'Campo nuevo'}</legend>
        {puedeGestionar ? null : <Aviso>{configuracion.textos.motivoSinPermiso}</Aviso>}
        <CamposDeCampo
          valores={estado.valores}
          alCambiar={estado.cambiar}
          alCambiarBandera={estado.cambiarBandera}
          campo={campo}
          banderas={configuracion.banderas}
          tipos={configuracion.tipos}
          gruposExistentes={nombresDeGrupo(todos)}
          errores={erroresDelFormulario(estado.errores, ediciones.errores.crear)}
          deshabilitado={!puedeGestionar}
        />
        {configuracion.hueco?.({
          valores: estado.valores,
          cambiarTexto: estado.cambiarTexto,
          deshabilitado: !puedeGestionar,
        })}
      </fieldset>
      <AvisosDelFormulario
        impacto={estado.aviso}
        conflicto={estado.conflicto}
        rechazo={estado.rechazo}
        enCurso={ediciones.enCurso}
        alRecargar={props.alRecargar}
      />
      {puedeGestionar ? (
        <PieDelFormulario
          esNuevo={campo === null}
          puedeEliminar={puedeEliminar}
          aviso={estado.aviso}
          enCurso={ediciones.enCurso}
          alCancelar={alCerrar}
          alPedirEliminar={() => void estado.pedirEliminar()}
          alConfirmarEliminar={() => void estado.confirmarEliminar()}
        />
      ) : null}
    </form>
  )
}
