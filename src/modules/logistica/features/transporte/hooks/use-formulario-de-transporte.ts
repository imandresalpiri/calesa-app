'use client'

import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import {
  cambiosDeTransporte,
  validarTransporte,
  valoresDeTransporte,
  type CambiosDeTransporte,
  type CampoDeTransporte,
  type ErroresDeTransporte,
  type Transporte,
  type ValoresDeTransporte,
} from '../../../entities/transporte/transporte'
import {
  versionesDeLasEntidades,
  type EntidadesDeLaUnidad,
} from '../../../entities/transporte/lectura-de-la-unidad'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { guardarTransporte } from '../actions/guardar-transporte'
import { resultadoDelEnvio } from './resultado-del-envio'
import { useBorradorDeTransporte } from './use-borrador-de-transporte'

const MENSAJE_DE_VALIDACION = 'Revisa los datos del transporte.'

type Args = {
  unidadId: string
  // Lo leído; nulo = la unidad todavía no tiene transporte (guardar crea).
  transporte: Transporte | null
  // El embarque y el contenedor leídos: sus versiones van con el guardado.
  entidades: EntidadesDeLaUnidad
  // El formulario, para llevar el foco al primer campo con error.
  formulario: RefObject<HTMLFormElement | null>
}

// El formulario del transporte de una unidad (6.08-2). «Guardar» manda sólo lo que difiere de lo leído, con las versiones leídas (la fila, su embarque y su contenedor), y sólo un envío a la
// vez. Un rechazo va junto a su campo (el de la base, por su `hint`, o el de la validación local, con los mismos textos); un `PT409` queda en `conflicto` hasta que llega una versión nueva de
// cualquiera de las tres, sin perder lo escrito.
export function useFormularioDeTransporte({ unidadId, transporte, entidades, formulario }: Args) {
  const version = transporte?.actualizadoEn ?? null
  const versiones = versionesDeLasEntidades(entidades)
  // Lo que cambia con cualquier escritura que este formulario ve: guardar lo del embarque no toca la fila de la unidad.
  const lectura = [version, versiones.embarqueEsperado, versiones.contenedorEsperado].join('|')
  const original = valoresDeTransporte(transporte)
  const { borrador, tocar, soltarYa, soltarAlLlegar } = useBorradorDeTransporte(lectura)
  const [errores, setErrores] = useState<ErroresDeTransporte>({})
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(lectura)
  const ocupado = useRef(false)

  const valores: ValoresDeTransporte = { ...original, ...borrador }
  const cambios = cambiosDeTransporte(original, valores)

  function escribir(campo: CampoDeTransporte, valor: string) {
    tocar(campo, valor)
    setErrores((antes) => {
      const resto = { ...antes }
      delete resto[campo]
      return resto
    })
  }

  async function enviar(pedido: CambiosDeTransporte) {
    ocupado.current = true
    setEnCurso(true)
    setError(null)
    setErrores({})
    const envio = await enviarAccion(
      guardarTransporte({
        vehiculoId: unidadId,
        actualizadoEnEsperado: version,
        ...versiones,
        cambios: pedido,
      }),
      MENSAJE_DE_VALIDACION,
    )
    const resultado = resultadoDelEnvio(envio)
    setEnCurso(false)
    ocupado.current = false
    if (resultado.tipo === 'ok') {
      const sinCambios = envio.ok && envio.data.sinCambios
      if (sinCambios) {
        soltarYa()
      } else {
        soltarAlLlegar()
      }
      avisarCambioDeLaUnidad(unidadId)
      avisarExito(sinCambios ? 'No había nada que cambiar.' : 'Transporte guardado.')
    } else if (resultado.tipo === 'conflicto') {
      setConflicto(resultado.mensaje)
    } else {
      setErrores(resultado.porCampo ?? {})
      setError(resultado.porCampo ? null : resultado.mensaje)
      enfocarPrimerError(formulario.current)
    }
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (ocupado.current || cambios === null) {
      return
    }
    const locales = validarTransporte(original, valores)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      setError(null)
      enfocarPrimerError(formulario.current)
      return
    }
    void enviar(cambios)
  }

  return {
    valores,
    errores,
    error,
    enCurso,
    conflicto,
    hayCambios: cambios !== null,
    escribir,
    guardar,
  }
}
