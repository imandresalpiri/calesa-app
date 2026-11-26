'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { FormularioDelModal } from './modal-de-formulario'
import { useConflictoHastaLaVersion } from './use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from './use-reintento-al-volver'
import { useUnEnvioALaVez } from './use-un-envio-a-la-vez'

type Args<Dato> = {
  // El modal sigue a la vista: cerrado, lo que esperaba la red no sale.
  abierto: boolean
  // Si cerrar ahora perdería algo escrito.
  hayCambios: boolean
  // La versión de la fila que se edita, tal como llegó por props. Un conflicto queda a la vista hasta que cambia.
  version: string | null
  // Los motivos junto a cada campo (por su clave en el formulario), o nulo si todo pasa. Corre antes de pedir nada.
  validar: () => Record<string, string> | null
  // El pedido al servidor, con la versión: una action sobre `enviarAccion()`.
  pedir: () => Promise<Envio<Dato>>
  // Lo que pasa al guardar (avisar, cerrar).
  alGuardar: (dato: Dato) => void
  // Un rechazo del servidor que pertenece a un campo: su clave. Sin clave, el rechazo se dice arriba del formulario.
  campoDelRechazo?: (error: ErrorApp) => string | null
  // Lo que trae la versión de ahora tras un conflicto. Por defecto `router.refresh()`; una lista que se lee desde el navegador la relee.
  recargar?: () => void | Promise<void>
}

// Dónde se dice un rechazo: junto a su campo, junto a cada uno de los que no pasaron, o arriba del formulario.
function motivosDelRechazo(
  envio: Extract<Envio<unknown>, { ok: false }>,
  campoDelRechazo: ((error: ErrorApp) => string | null) | undefined,
): { errores: Record<string, string>; aviso: string | null } {
  const campo = campoDelRechazo?.(envio.error) ?? null
  if (campo) {
    return { errores: { [campo]: envio.error.mensaje }, aviso: null }
  }
  const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
  return { errores: porCampo ?? {}, aviso: porCampo ? null : envio.error.mensaje }
}

// El envío de un formulario con versión que se abre en un modal (las tarjetas de ajustes): lo de `useEnvioDeModal` más el conflicto. Un
// `PT409` deja el aviso con «Recargar» (`router.refresh()`, o el `recargar` recibido, trae la versión de ahora y lo escrito queda) y «Guardar» apagado hasta que llega
// esa versión nueva (`useConflictoHastaLaVersion`: enviar en el instante de pulsar «Recargar» mandaría la vieja y volvería a chocar).
// La versión llega por props al abrir y nunca va en la `key` del modal: guardar lo remontaría y se perdería lo tipeado.
export function useEnvioConVersion<Dato>({
  abierto,
  hayCambios,
  version,
  validar,
  pedir,
  alGuardar,
  campoDelRechazo,
  recargar,
}: Args<Dato>): FormularioDelModal & {
  errores: Record<string, string>
  quitarMotivo: (clave: string) => void
} {
  const router = useRouter()
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<{ desde: number } | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(version)
  const [recargando, recargarPagina] = useTransition()
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function enviar(): Promise<boolean> {
    const motivos = validar()
    if (motivos) {
      setErrores(motivos)
      setAviso(null)
      return false
    }
    const envio = await mandar(pedir)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      setErrores({})
      setAviso(null)
      alGuardar(envio.data)
      return true
    }
    if ('sinRed' in envio) {
      setPendiente((antes) => antes ?? { desde: Date.now() })
      return false
    }
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
      setAviso(null)
      return false
    }
    const rechazo = motivosDelRechazo(envio, campoDelRechazo)
    setErrores(rechazo.errores)
    setAviso(rechazo.aviso)
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    enCurso,
    hayCambios,
    conflicto,
    aviso,
    enLinea,
    esperandoConexion: pendiente !== null,
    enviar,
    reintentar: () => {
      void enviar()
    },
    recargar: () => {
      recargarPagina(async () => {
        await (recargar ? recargar() : router.refresh())
      })
    },
    recargando,
    errores,
    quitarMotivo: (clave) => {
      setErrores(({ [clave]: _resuelto, ...resto }) => resto)
    },
  }
}
