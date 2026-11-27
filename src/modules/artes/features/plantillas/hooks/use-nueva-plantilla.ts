'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { formatoDe, medidasDelFormato, type ClaveDeFormato } from '../../../entities/formatos'
import { esquemaDelNombreDeArte, NOMBRE_INICIAL } from '../../../entities/nombres'
import { crearPlantillaDeArte } from '../actions/crear-plantilla-de-arte'

export const CAMPO_DEL_ORIGEN = 'nueva-plantilla-origen'
export const CAMPO_DEL_FORMATO = 'nueva-plantilla-formato'
export const CAMPO_DEL_ANCHO = 'nueva-plantilla-ancho'
export const CAMPO_DEL_ALTO = 'nueva-plantilla-alto'
export const CAMPO_DEL_NOMBRE = 'nueva-plantilla-nombre'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'
const FORMATO_INICIAL: ClaveDeFormato = 'cuadrado'

// El `hint` de la base (o el campo de la action) → el campo del formulario.
const CAMPO_DEL_HINT: Record<string, string> = {
  origen: CAMPO_DEL_ORIGEN,
  formato: CAMPO_DEL_FORMATO,
  nombre: CAMPO_DEL_NOMBRE,
  ancho: CAMPO_DEL_ANCHO,
}

type Args = { origenInicial: string; alCerrar: () => void }

// El estado de «Nueva plantilla»: origen, formato (con ancho y alto si es Personalizado) y el nombre, «Nueva plantilla» precargado. El id del
// intento vive mientras el modal está abierto (un reintento, también el que sale solo al volver la red, no crea dos). Lo que la base rechaza
// por un campo se dice junto a él; lo demás, arriba. Al crear se cierra y la tarjeta aparece primera (la action revalida `/artes`).
export function useNuevaPlantilla({ origenInicial, alCerrar }: Args) {
  const { locale } = useRegional()
  const [intento] = useState(() => crypto.randomUUID())
  const [origenId, setOrigenId] = useState(origenInicial)
  const [formato, setFormato] = useState<ClaveDeFormato>(FORMATO_INICIAL)
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [nombre, setNombre] = useState(NOMBRE_INICIAL)
  const crear = useAction(crearPlantillaDeArte)
  const personalizado = formatoDe(formato).ancho === null

  const lado = (texto: string) => {
    const leido = leerNumeroTipeado(texto, locale)
    return leido.ok && leido.valor !== null ? leido.valor : 0
  }

  const envio = useEnvioDeModal<{ id: string }>({
    abierto: true,
    hayCambios:
      origenId !== origenInicial ||
      formato !== FORMATO_INICIAL ||
      ancho !== '' ||
      alto !== '' ||
      nombre !== NOMBRE_INICIAL,
    validar: () => {
      const motivos: Record<string, string> = {}
      const leido = esquemaDelNombreDeArte.safeParse(nombre)
      if (!leido.success) {
        motivos[CAMPO_DEL_NOMBRE] = leido.error.issues[0]?.message ?? MENSAJE_DE_VALIDACION
      }
      const medidas = medidasDelFormato(formato, { ancho: lado(ancho), alto: lado(alto) })
      if (!medidas.ok) {
        motivos[CAMPO_DEL_ANCHO] = medidas.error.mensaje
      }
      return Object.keys(motivos).length > 0 ? motivos : null
    },
    pedir: () =>
      enviarAccion(
        crear.executeAsync({
          id: intento,
          nombre,
          formato,
          origenId,
          ancho: personalizado ? lado(ancho) : null,
          alto: personalizado ? lado(alto) : null,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: () => {
      avisarExito('Plantilla de arte creada.')
      alCerrar()
    },
    campoDelRechazo: (error) => (error.causa ? (CAMPO_DEL_HINT[error.causa] ?? null) : null),
  })

  return {
    ...envio,
    origenId,
    formato,
    ancho,
    alto,
    nombre,
    personalizado,
    elegirOrigen: (valor: string) => {
      setOrigenId(valor)
      envio.quitarMotivo(CAMPO_DEL_ORIGEN)
    },
    elegirFormato: (valor: ClaveDeFormato) => {
      setFormato(valor)
      envio.quitarMotivo(CAMPO_DEL_FORMATO)
      envio.quitarMotivo(CAMPO_DEL_ANCHO)
    },
    // Ancho y alto comparten su motivo (va bajo el ancho).
    escribirLado: (cual: 'ancho' | 'alto', valor: string) => {
      ;(cual === 'ancho' ? setAncho : setAlto)(valor)
      envio.quitarMotivo(CAMPO_DEL_ANCHO)
    },
    escribirNombre: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo(CAMPO_DEL_NOMBRE)
    },
  }
}

export type NuevaPlantilla = ReturnType<typeof useNuevaPlantilla>
