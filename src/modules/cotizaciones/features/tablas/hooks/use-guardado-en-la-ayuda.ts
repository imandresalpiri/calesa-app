'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { formatearNumero } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { filasParaPublicar } from '../../../entities/tablas/edicion'
import { abrirElRechazo, publicables } from '../../../entities/tablas/edicion-en-la-ayuda'
import { LARGO_MAXIMO_DE_NOTA, type PublicacionDeTabla } from '../../../entities/tablas/publicacion'
import { publicarTabla } from '../actions/publicar-tabla'
import type { EdicionEnLaAyudaEnUso } from './use-edicion-en-la-ayuda'

const MENSAJE_DE_VALIDACION = 'Revisa la tabla.'

// La nota de lo publicado desde la ayuda: de qué celda vino.
export const notaDeLaAyuda = (rotulo: string) =>
  `Desde la ayuda de «${rotulo}».`.slice(0, LARGO_MAXIMO_DE_NOTA)

type Pendiente = { desde: number }

type Salida =
  | { tipo: 'sin_red' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'aviso'; mensaje: string }
  | ({ tipo: 'celda' } & NonNullable<ReturnType<typeof abrirElRechazo>>)

// Qué hacer con un rechazo: esperar la red, el conflicto, la celda que nombra la base (si es una de las que se editan aquí) o el mensaje en la barra.
function salidaDelRechazo(
  envio: Exclude<Envio<PublicacionDeTabla>, { ok: true }>,
  edicion: EdicionEnLaAyudaEnUso,
): Salida {
  if ('sinRed' in envio) return { tipo: 'sin_red' }
  if (envio.error.codigo === 'conflicto') return { tipo: 'conflicto', mensaje: envio.error.mensaje }
  const camino = Object.keys(envio.porCampo ?? {}).find((clave) => clave.startsWith('filas'))
  const { leida, aplicada, columnas } = edicion
  const enLaFila =
    camino && leida && aplicada
      ? abrirElRechazo(aplicada, leida.tabla.columnas, {
          camino,
          mensaje: envio.porCampo?.[camino] ?? envio.error.mensaje,
        })
      : null
  const clave = enLaFila?.rechazo.clave
  return enLaFila && columnas.some((c) => c.clave === clave)
    ? { tipo: 'celda', ...enLaFila }
    : { tipo: 'aviso', mensaje: envio.error.mensaje }
}

// «Guardar» de la edición desde la ayuda: publica la tabla entera una vez (`publicarTabla`, con la versión que se leyó y la nota de la celda), un envío a la vez. El PT409
// queda como conflicto con su mensaje (quién publicó qué versión y cuándo) hasta «Recargar»; el 22023 de una celda abre su fila con el mensaje en el campo; otro rechazo
// (el 42501 de una compartida) va en la barra con el texto de la base. Sin conexión, lo editado queda y sale solo al volver.
export function useGuardadoEnLaAyuda(args: {
  edicion: EdicionEnLaAyudaEnUso
  rotulo: string
  alPublicar: (publicacion: PublicacionDeTabla) => void
}) {
  const { edicion, rotulo } = args
  const { locale } = useRegional()
  const publicar = useAction(publicarTabla)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function rechazo(envio: Exclude<Envio<PublicacionDeTabla>, { ok: true }>) {
    const salida = salidaDelRechazo(envio, edicion)
    if (salida.tipo === 'sin_red') {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return
    }
    setPendiente(null)
    if (salida.tipo === 'conflicto') setConflicto(salida.mensaje)
    else if (salida.tipo === 'aviso') setAviso(salida.mensaje)
    else {
      edicion.mostrarRechazo(salida.edicion, salida.rechazo)
      setAviso('La tabla no cambió.')
    }
  }

  async function guardar(): Promise<boolean> {
    const { leida, aplicada } = edicion
    if (!leida || !aplicada || conflicto !== null || edicion.error !== null) return false
    setAviso(null)
    const envio = await mandar(async () =>
      enviarAccion(
        publicar.executeAsync({
          tablaId: leida.tabla.id,
          origenId: leida.tabla.origenId,
          filas: filasParaPublicar(publicables(aplicada).filas),
          nota: notaDeLaAyuda(rotulo),
          versionEsperada: leida.tabla.version,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) return false
    if (!envio.ok) {
      rechazo(envio)
      return false
    }
    setPendiente(null)
    avisarExito(
      `Tabla publicada (versión ${formatearNumero(envio.data.version, { locale, decimales: 0 })}).`,
    )
    edicion.descartar()
    args.alPublicar(envio.data)
    return true
  }

  const enLinea = useReintentoAlVolver(pendiente, () => guardar())
  return {
    enCurso,
    conflicto,
    aviso,
    enLinea,
    esperandoConexion: pendiente !== null,
    guardar: () => void guardar(),
    // Tras un conflicto: la tabla viva otra vez (lo editado se va recién ahora).
    recargar: () => {
      setConflicto(null)
      setAviso(null)
      edicion.releer()
    },
    descartar: () => {
      setConflicto(null)
      setAviso(null)
      setPendiente(null)
      edicion.descartar()
    },
  }
}

export type GuardadoEnLaAyuda = ReturnType<typeof useGuardadoEnLaAyuda>
