'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { avisar } from '@/shared/ui/toasts'
import {
  AVISO_DE_CAMARA_QUE_NO_ESTA,
  abrirLaCamara,
  type CamaraAbierta,
  type EstadoDeLaCamara,
} from '../abrir-la-camara'

export type Dispositivo = { id: string; nombre: string }

type Abierta = CamaraAbierta & { clave: string }

function detener(stream: MediaStream | null): void {
  stream?.getTracks().forEach((pista) => {
    pista.stop()
  })
}

// Las cámaras que hay (con su nombre cuando el permiso ya se dio) y se vuelve a leer al conectar o quitar una.
function useDispositivos(lista: boolean): Dispositivo[] {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  useEffect(() => {
    const medios = navigator.mediaDevices as MediaDevices | undefined
    if (!medios || typeof medios.enumerateDevices !== 'function') {
      return
    }
    let vigente = true
    function leer() {
      void medios?.enumerateDevices().then(
        (todos) => {
          if (vigente) {
            setDispositivos(
              todos
                .filter((d) => d.kind === 'videoinput' && d.deviceId !== '')
                .map((d, i) => ({ id: d.deviceId, nombre: d.label || `Cámara ${i + 1}` })),
            )
          }
        },
        () => undefined,
      )
    }
    leer()
    medios.addEventListener('devicechange', leer)
    return () => {
      vigente = false
      medios.removeEventListener('devicechange', leer)
    }
    // Al quedar lista la cámara el permiso ya se dio y los nombres aparecen: se vuelve a leer.
  }, [lista])
  return dispositivos
}

// Abre la cámara de ese intento y la cierra (detiene sus pistas) al cambiar de cámara, al reintentar y al desmontarse. Si la elegida ya no está, cae a la
// primera y lo dice una vez; si se desconecta, se vuelve a abrir.
function useCamaraAbierta(
  deviceId: string | null,
  clave: string,
  reabrir: () => void,
): Abierta | null {
  const [abierta, setAbierta] = useState<Abierta | null>(null)
  const avisada = useRef(false)
  useEffect(() => {
    let vigente = true
    let stream: MediaStream | null = null
    void abrirLaCamara(deviceId).then((resultado) => {
      if (!vigente) {
        detener(resultado.stream)
        return
      }
      stream = resultado.stream
      setAbierta({ ...resultado, clave })
      if (resultado.cayoALaPrimera && !avisada.current) {
        avisada.current = true
        avisar(AVISO_DE_CAMARA_QUE_NO_ESTA)
      }
      resultado.stream?.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (vigente) {
          reabrir()
        }
      })
    })
    return () => {
      vigente = false
      detener(stream)
    }
  }, [clave, deviceId, reabrir])
  return abierta?.clave === clave ? abierta : null
}

// La cámara de la ventana: la abre al montarse y la cierra al desmontarse. `estado` es «cargando» mientras lo abierto no sea de la cámara y el intento de ahora.
export function useCamara(deviceId: string | null): {
  estado: EstadoDeLaCamara
  stream: MediaStream | null
  dispositivos: Dispositivo[]
  // El `deviceId` que de verdad se abrió (puede no ser el elegido).
  usada: string | null
  reintentar: () => void
} {
  const [intento, setIntento] = useState(0)
  const reintentar = useCallback(() => {
    setIntento((n) => n + 1)
  }, [])
  const vigente = useCamaraAbierta(deviceId, `${deviceId ?? ''}|${intento}`, reintentar)
  const dispositivos = useDispositivos(vigente?.estado === 'lista')
  return {
    estado: vigente?.estado ?? 'cargando',
    stream: vigente?.stream ?? null,
    dispositivos,
    usada: vigente?.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? null,
    reintentar,
  }
}
