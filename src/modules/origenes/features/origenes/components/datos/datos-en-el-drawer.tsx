'use client'

import { useRouter } from 'next/navigation'
import { useId } from 'react'
import { plataformasConocidas } from '@/shared/lib/apibara'
import { errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { useCambiosSinGuardar, useSalidaDelDrawer } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../../entities/motivos'
import type { OrigenConUso } from '../../../../entities/origen'
import { hayCambiosEnElOrigen, useValoresDeOrigen } from '../../hooks/use-valores-de-origen'
import { CamposDeOrigen } from '../campos-de-origen'
import { FichaDelOrigen } from './ficha-del-origen'
import { useGuardarLosDatos } from './use-guardar-los-datos'

type Props = {
  origen: OrigenConUso
  puedeGestionar: boolean
  alCerrar: () => void
}

// Lo de adentro del drawer «Datos»: la ficha (tipo y clave interna, que no cambian) y el formulario, con «Guardar» y «Cancelar» al pie. Se monta en cada
// apertura (`key`): lo tipeado vive mientras el drawer está abierto. Cerrar con cambios (Esc, la ✕, afuera) pregunta en el pie del drawer (no tienen borrador); «Cancelar» los descarta. Si otra persona guardó antes (`PT409`),
// el aviso lo dice dentro del formulario y «Recargar» trae su versión sin borrar lo tipeado: guardar otra vez la pisa a sabiendas. Sin `origenes.gestionar`,
// todo se ve apagado con su motivo y no hay pie.
export function DatosEnElDrawer({ origen, puedeGestionar, alCerrar }: Props) {
  const router = useRouter()
  const idFormulario = useId()
  const guardado = {
    nombre: origen.nombre,
    sustantivo: origen.sustantivo,
    genero: origen.genero,
    color: origen.color,
    plataformas: plataformasConocidas(origen.apibaraPlataformas),
  }
  // El género guardado es una decisión: no se pisa al retocar el sustantivo.
  const { valores, cambiar, reiniciar } = useValoresDeOrigen(guardado, true)
  const hayCambios = puedeGestionar && hayCambiosEnElOrigen(valores, guardado)
  useCambiosSinGuardar(hayCambios, reiniciar, { preguntaAlCerrar: true })
  // Mientras el drawer pregunta (en su pie) el de acá se va: una sola pregunta a la vista.
  const preguntando = useSalidaDelDrawer()?.confirmando === true
  const envio = useGuardarLosDatos(origen, valores, alCerrar)
  const { errores, conflicto, errorDeNombre } = envio

  return (
    <form
      id={idFormulario}
      method="post"
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void envio.guardar(evento.currentTarget)
      }}
    >
      {conflicto === null ? null : (
        <AvisoDeConflicto
          mensaje={conflicto}
          detalle="No se guardó nada. Recargar trae su versión y conserva lo que escribiste: si guardas, lo tuyo la reemplaza."
          alRecargar={() => {
            envio.olvidarConflicto()
            router.refresh()
          }}
        />
      )}
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">Datos de {origen.nombre}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
        <FichaDelOrigen origen={origen} />
        <CamposDeOrigen
          valores={valores}
          alCambiar={(parcial) => {
            if (parcial.nombre !== undefined) {
              envio.olvidarErrorDeNombre()
            }
            cambiar(parcial)
          }}
          esDeSubasta={origen.tipo === 'subasta'}
          errores={{
            nombre: errorDeNombre ?? errorDeCampo(errores, 'nombre'),
            sustantivo: errorDeCampo(errores, 'sustantivo'),
            color: errorDeCampo(errores, 'color'),
            plataformas: errorDeCampo(errores, 'plataformas'),
          }}
          deshabilitado={!puedeGestionar}
        />
      </fieldset>
      {puedeGestionar && !preguntando ? (
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={envio.enCurso}
          alCancelar={() => {
            reiniciar()
            alCerrar()
          }}
        />
      ) : null}
    </form>
  )
}
