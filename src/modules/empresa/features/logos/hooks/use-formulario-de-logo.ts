'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { LogoListo } from '../../../composicion.client'
import {
  motivoDelNombreDeLogo,
  nombreSugerido,
  type ListaDeLogos,
  type VarianteDelLogo,
} from '../../../entities/logos'

export type CampoDeLogo = 'nombre' | 'archivo'

type Args = {
  // Nulo = «Subir un logo»; con una variante, «Renombrar».
  original: VarianteDelLogo | null
  lista: ListaDeLogos
  abierto: boolean
  alCerrar: () => void
  enCurso: boolean
  // Manda lo revisado; nulo si ya había un envío en vuelo.
  mandar: (nombre: string, archivo: LogoListo | null) => Promise<Envio<unknown> | null>
}

type Pendiente = { desde: number }

function esCampo(clave: string): clave is CampoDeLogo {
  return clave === 'nombre' || clave === 'archivo'
}

// Los motivos de lo tipeado y elegido antes de mandar: el nombre (vacío, largo o repetido) y, al subir, el archivo.
function motivosDelFormulario(
  nombre: string,
  archivo: LogoListo | null,
  original: VarianteDelLogo | null,
  lista: ListaDeLogos,
): Partial<Record<CampoDeLogo, string>> {
  const deNombre = motivoDelNombreDeLogo(nombre, lista, original?.id ?? null)
  const deArchivo = original === null && archivo === null ? 'Elige el archivo del logo.' : null
  return {
    ...(deNombre === null ? {} : { nombre: deNombre }),
    ...(deArchivo === null ? {} : { archivo: deArchivo }),
  }
}

// Lo que rechazó la base por su campo (`hint`): sólo los dos del formulario; el resto (el tope) va arriba.
function motivosDeCampos(porCampo: Record<string, string> | undefined) {
  return Object.fromEntries(Object.entries(porCampo ?? {}).filter(([clave]) => esCampo(clave)))
}

// Lo tipeado (el nombre) y lo elegido (el archivo, sólo al subir) y el motivo de cada uno; escribir o elegir borra su motivo.
function useCamposDeLogo(original: VarianteDelLogo | null, lista: ListaDeLogos) {
  const inicial = original?.nombre ?? nombreSugerido(lista)
  const [nombre, setNombre] = useState(inicial)
  const [archivo, setArchivo] = useState<LogoListo | null>(null)
  const [errores, setErrores] = useState<Partial<Record<CampoDeLogo, string>>>({})

  function limpiar(campo: CampoDeLogo) {
    setErrores(({ [campo]: _resuelto, ...resto }) => resto)
  }

  return {
    inicial,
    nombre,
    archivo,
    errores,
    setErrores,
    escribirNombre: (valor: string) => {
      setNombre(valor)
      limpiar('nombre')
    },
    elegirArchivo: (elegido: LogoListo) => {
      setArchivo(elegido)
      limpiar('archivo')
    },
    // El archivo no sirvió (tipo, peso, SVG inválido): el motivo queda junto a la zona del archivo y no se sube nada.
    rechazarArchivo: (motivo: string) => {
      setErrores((antes) => ({ ...antes, archivo: motivo }))
    },
  }
}

// «Recargar» tras un conflicto: la versión nueva llega con la página y lo tipeado se conserva.
function useRecarga() {
  const router = useRouter()
  const [recargando, recargarPagina] = useTransition()
  return {
    recargando,
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}

// El estado del modal de una variante: el nombre, el archivo elegido (sólo al subir) y el motivo junto a cada uno (o arriba, si no es de un campo: el
// tope), el conflicto con «Recargar» que conserva lo tipeado, y lo que espera a la red: el archivo elegido sigue en el modal y sale solo al volver.
export function useFormularioDeLogo({ original, lista, abierto, alCerrar, enCurso, mandar }: Args) {
  const {
    inicial,
    nombre,
    archivo,
    errores,
    setErrores,
    escribirNombre,
    elegirArchivo,
    rechazarArchivo,
  } = useCamposDeLogo(original, lista)
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(original?.actualizadoEn ?? null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const { recargando, recargar } = useRecarga()

  function aplicar(envio: Envio<unknown> | null): boolean {
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito(original ? 'Logo renombrado.' : 'Logo guardado.')
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
    const deCampos = motivosDeCampos(envio.porCampo)
    setErrores(deCampos)
    setAviso(Object.keys(deCampos).length > 0 ? null : envio.error.mensaje)
    return false
  }

  async function enviar(): Promise<boolean> {
    if (conflicto !== null) {
      return false
    }
    const motivos = motivosDelFormulario(nombre, archivo, original, lista)
    if (Object.keys(motivos).length > 0) {
      setErrores(motivos)
      return false
    }
    if (original && nombre.trim() === original.nombre) {
      alCerrar()
      return true
    }
    setAviso(null)
    return aplicar(await mandar(nombre.trim(), archivo))
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, () => enviar())

  return {
    nombre,
    archivo,
    errores,
    aviso,
    conflicto,
    enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
    hayCambios: original
      ? nombre.trim() !== original.nombre
      : archivo !== null || nombre !== inicial,
    recargando,
    escribirNombre,
    elegirArchivo,
    rechazarArchivo,
    enviar,
    reintentar: () => {
      void enviar()
    },
    recargar,
  }
}

export type FormularioDeLogo = ReturnType<typeof useFormularioDeLogo>
