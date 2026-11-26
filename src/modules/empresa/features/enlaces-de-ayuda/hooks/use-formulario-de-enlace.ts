'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  camposCambiados,
  revisarCamposDeEnlace,
  type CampoDeEnlace,
  type CamposDeEnlace,
} from '../../../entities/enlaces-de-ayuda'

type Args = {
  // Nulo = uno nuevo.
  original: CamposDeEnlace | null
  // La versión que manda al guardar: un conflicto espera a que cambie (la trae «Recargar»).
  version: string | null
  abierto: boolean
  alCerrar: () => void
  enCurso: boolean
  // Manda lo revisado (los campos enteros y sólo lo que cambió); nulo si ya había un envío en vuelo.
  mandar: (
    campos: CamposDeEnlace,
    cambios: Partial<CamposDeEnlace>,
  ) => Promise<Envio<unknown> | null>
  textos: { creado: string; guardado: string }
}

type Pendiente = { desde: number }

const CAMPOS: readonly CampoDeEnlace[] = ['titulo', 'url', 'descripcion']

function esCampo(clave: string): clave is CampoDeEnlace {
  return (CAMPOS as readonly string[]).includes(clave)
}

function soloLoCambiado(campos: CamposDeEnlace, original: CamposDeEnlace): Partial<CamposDeEnlace> {
  return {
    ...(campos.titulo === original.titulo ? {} : { titulo: campos.titulo }),
    ...(campos.url === original.url ? {} : { url: campos.url }),
    ...(campos.descripcion === original.descripcion ? {} : { descripcion: campos.descripcion }),
  }
}

// Lo tipeado en los tres campos y el motivo de cada uno; escribir en un campo borra su motivo.
function useCamposDeEnlace(original: CamposDeEnlace | null) {
  const [titulo, setTitulo] = useState(original?.titulo ?? '')
  const [url, setUrl] = useState(original?.url ?? '')
  const [descripcion, setDescripcion] = useState(original?.descripcion ?? '')
  const [errores, setErrores] = useState<Partial<Record<CampoDeEnlace, string>>>({})

  function escribir(campo: CampoDeEnlace, valor: string) {
    if (campo === 'titulo') setTitulo(valor)
    if (campo === 'url') setUrl(valor)
    if (campo === 'descripcion') setDescripcion(valor)
    setErrores(({ [campo]: _resuelto, ...resto }) => resto)
  }

  return { tipeado: { titulo, url, descripcion }, errores, setErrores, escribir }
}

// El estado del modal de un enlace de ayuda (de la empresa o propio): título, dirección y descripción, el motivo junto a cada campo (o arriba,
// si no es de un campo: el tope), el conflicto con «Recargar» que conserva lo tipeado, y lo que espera a la red (sale solo al volver).
export function useFormularioDeEnlace({
  original,
  version,
  abierto,
  alCerrar,
  enCurso,
  mandar,
  textos,
}: Args) {
  const router = useRouter()
  const { tipeado, errores, setErrores, escribir } = useCamposDeEnlace(original)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [recargando, recargarPagina] = useTransition()

  function aplicar(envio: Envio<unknown> | null): boolean {
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito(original ? textos.guardado : textos.creado)
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      return false
    }
    const porCampo = Object.entries(envio.porCampo ?? {})
    const deCampos = Object.fromEntries(porCampo.filter(([clave]) => esCampo(clave)))
    setErrores(deCampos)
    setAviso(Object.keys(deCampos).length > 0 ? null : envio.error.mensaje)
    return false
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const revisado = revisarCamposDeEnlace(tipeado)
    if (!revisado.ok) {
      setErrores(revisado.motivos)
      return false
    }
    if (original && !camposCambiados(tipeado, original)) {
      alCerrar()
      return true
    }
    setAviso(null)
    const cambios = original ? soloLoCambiado(revisado.campos, original) : revisado.campos
    return aplicar(await mandar(revisado.campos, cambios))
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    tipeado,
    errores,
    aviso,
    conflicto,
    enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    hayCambios: camposCambiados(tipeado, original),
    recargando,
    escribir,
    enviar,
    reintentar: () => {
      void enviar()
    },
    // La versión nueva llega con la página; lo tipeado se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}

export type FormularioDeEnlace = ReturnType<typeof useFormularioDeEnlace>
