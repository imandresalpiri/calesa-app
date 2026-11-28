'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { useAtajo } from '@/shared/ui/atajos'
import { avisarError } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { subirMiniatura } from '../../../composicion.client'
import { validarDocumento } from '../../../entities/documento'
import {
  estadoDelGuardado,
  type EstadoDelGuardado,
  type FalloDelGuardado,
} from '../../../entities/editor/guardado'
import { mismoDocumento } from '../../../entities/editor/mismo-documento'
import { guardarPlantillaDeArte } from '../../plantillas/actions/guardar-plantilla-de-arte'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from '../../plantillas/hooks/mensajes'
import type { LoQueSeEdita } from './use-borrador-local'

type Args = {
  id: string
  versionInicial: string
  guardadoInicial: LoQueSeEdita
  actual: LoQueSeEdita
  soloLectura: boolean
  // La miniatura de 480 px del documento (la arma el lienzo); nula si el navegador no pudo.
  miniatura: () => Promise<Blob | null>
  // Termina el texto que se escribe encima del lienzo; `true` si había uno (entra al documento en el cuadro siguiente).
  terminarElTexto: () => boolean
  // Por qué no se guarda aunque haya cambios («Corrige {x} para guardar.»): nulo si se puede. El borrador local se anota igual.
  motivoParaNoGuardar: string | null
}

type Fallo = { tipo: FalloDelGuardado; error: ErrorApp | null }

// El alto de los textos no cuenta: lo mide el lienzo con el vehículo de ejemplo de ahora (`mismoDocumento`).
const iguales = (a: LoQueSeEdita, b: LoQueSeEdita) =>
  a.nombre === b.nombre && mismoDocumento(a.documento, b.documento)

// La miniatura se sube antes de guardar (por hash: repetirla es el mismo objeto). Si no se pudo, se guarda igual y queda la de antes.
async function subirLaMiniatura(armar: () => Promise<Blob | null>): Promise<string | null> {
  try {
    const blob = await armar()
    if (blob === null) {
      return null
    }
    const subida = await subirMiniatura(blob)
    return subida.ok ? subida.data.ruta : null
  } catch {
    return null
  }
}

// Ctrl+S con un texto abierto: lo escrito entra al documento al salir del campo, y se lee después de que React lo dibuje.
const unCuadro = () =>
  new Promise<void>((listo) => {
    requestAnimationFrame(() => {
      listo()
    })
  })

function falloDe(envio: Envio<unknown> & { ok: false }): Fallo {
  if ('sinRed' in envio) {
    return { tipo: 'sin-conexion', error: null }
  }
  return { tipo: envio.error.codigo === 'conflicto' ? 'conflicto' : 'error', error: envio.error }
}

// Guardar el editor de artes («Guardar» o Ctrl+S): el documento y el nombre con la versión sobre la que se editó (`PT409` si otra persona
// guardó antes) y la miniatura nueva. Un envío a la vez: lo que se pide mientras otro vuela sale al terminar, con la versión que devolvió.
// Sin red queda esperando y sale solo al volver (`useReintentoAlVolver`). `hayCambios` compara lo que se ve con lo último guardado.
export function useGuardado(args: Args) {
  const { id, actual, soloLectura } = args
  const accion = useAction(guardarPlantillaDeArte)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [guardado, setGuardado] = useState(args.guardadoInicial)
  const [version, setVersion] = useState(args.versionInicial)
  const [fallo, setFallo] = useState<Fallo | null>(null)
  const hayCambios = useMemo(() => !iguales(actual, guardado), [actual, guardado])
  const ultimo = useRef({ ...args, version, guardado })
  const otraVez = useRef(false)
  useEffect(() => {
    ultimo.current = { ...args, version: ultimo.current.version, guardado: ultimo.current.guardado }
  })

  const enviar = async (): Promise<boolean> => {
    const { actual: lo, version: base, miniatura } = ultimo.current
    const valido = validarDocumento(lo.documento)
    if (!valido.ok) {
      setFallo({ tipo: 'error', error: valido.error })
      avisarError(valido.error)
      return false
    }
    const miniaturaRuta = await subirLaMiniatura(miniatura)
    const hecho = await enviarAccion(
      accion.executeAsync({
        id,
        actualizadoEnEsperado: base,
        nombre: lo.nombre,
        documento: lo.documento,
        miniaturaRuta,
      }),
      MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
    )
    if (hecho.ok) {
      ultimo.current = { ...ultimo.current, version: hecho.data.actualizado_en, guardado: lo }
      setGuardado(lo)
      setVersion(hecho.data.actualizado_en)
      setFallo(null)
      return true
    }
    const motivo = falloDe(hecho)
    setFallo(motivo)
    if (motivo.tipo === 'error' && motivo.error) {
      avisarError(motivo.error)
    }
    return false
  }

  const guardar = async (): Promise<boolean> => {
    if (!soloLectura && ultimo.current.terminarElTexto()) {
      await unCuadro()
    }
    if (soloLectura || iguales(ultimo.current.actual, ultimo.current.guardado)) {
      return true
    }
    if (ultimo.current.motivoParaNoGuardar !== null) {
      return false
    }
    const hecho = await mandar(enviar)
    if (hecho === null) {
      otraVez.current = true
      return false
    }
    if (otraVez.current) {
      otraVez.current = false
      // Lo pedido mientras volaba sale con la versión que devolvió; si falló, no se repite (un conflicto daría otro `PT409` y otro aviso).
      return hecho ? guardar() : false
    }
    return hecho
  }

  useReintentoAlVolver(fallo?.tipo === 'sin-conexion' ? fallo : null, guardar)
  useAtajo('guardar', () => void guardar(), !soloLectura)

  const estado: EstadoDelGuardado = estadoDelGuardado({
    enCurso,
    fallo: fallo?.tipo ?? null,
    hayCambios,
  })
  return { estado, hayCambios, version, guardado, guardar: () => void guardar() }
}
