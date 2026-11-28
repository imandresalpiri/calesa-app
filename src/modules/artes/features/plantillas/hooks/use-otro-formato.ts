'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { rutaDeLaPlantillaDeArte } from '@/shared/lib/rutas'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { formatosDestino } from '../../../entities/editor/otro-formato'
import { formatoDe, medidasDelFormato, type ClaveDeFormato } from '../../../entities/formatos'
import { esquemaDelNombreDeArte, nombreDeLaCopia } from '../../../entities/nombres'
import { duplicarEnOtroFormato } from '../actions/duplicar-en-otro-formato'
import { anotarLaVuelta } from './vuelta-a-artes'

export const CAMPO_DEL_FORMATO_DESTINO = 'otro-formato-formato'
export const CAMPO_DEL_ANCHO_DESTINO = 'otro-formato-ancho'
export const CAMPO_DEL_ALTO_DESTINO = 'otro-formato-alto'
export const CAMPO_DEL_NOMBRE_DESTINO = 'otro-formato-nombre'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

const CAMPO_DEL_HINT: Record<string, string> = {
  nombre: CAMPO_DEL_NOMBRE_DESTINO,
  ancho: CAMPO_DEL_ANCHO_DESTINO,
}

// El aviso de la copia creada, con «Abrir» (sale de la pantalla: con algo escrito, antes pregunta).
function avisarLaCopia(mensaje: string, abrir: () => void) {
  avisarExito(mensaje, {
    etiqueta: 'Abrir',
    sale: true,
    alHacer: () => {
      anotarLaVuelta()
      abrir()
    },
  })
}

export type FuenteDelOtroFormato = { id: string; nombre: string; formato: ClaveDeFormato }

type Args = {
  fuente: FuenteDelOtroFormato
  // Lo que se ve en el editor (sin guardar, también); la lista no lo manda y la action lee el guardado.
  documento?: () => unknown
  alCerrar: () => void
}

// El estado de «Duplicar en otro formato»: el formato (los del mismo tipo, sin el propio), sus medidas si es Personalizado y el nombre,
// «<nombre> (copia)». Quien lo monta lo dibuja de cero en cada apertura: el id del intento es de esa apertura (un reintento no crea dos). Al
// crear, el aviso dice dónde quedó y ofrece abrirla.
export function useOtroFormato({ fuente, documento, alCerrar }: Args) {
  const router = useRouter()
  const { locale } = useRegional()
  const destinos = formatosDestino(fuente.formato)
  const formatoInicial = destinos[0]?.clave ?? fuente.formato
  const nombreInicial = nombreDeLaCopia(fuente.nombre)
  const [intento] = useState(() => crypto.randomUUID())
  const [formato, setFormato] = useState<ClaveDeFormato>(formatoInicial)
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [nombre, setNombre] = useState(nombreInicial)
  const duplicar = useAction(duplicarEnOtroFormato)
  const personalizado = formatoDe(formato).ancho === null

  const lado = (texto: string) => {
    const leido = leerNumeroTipeado(texto, locale)
    return leido.ok && leido.valor !== null ? leido.valor : 0
  }

  const envio = useEnvioDeModal<{ id: string }>({
    abierto: true,
    hayCambios:
      formato !== formatoInicial || ancho !== '' || alto !== '' || nombre !== nombreInicial,
    validar: () => {
      const motivos: Record<string, string> = {}
      const leido = esquemaDelNombreDeArte.safeParse(nombre)
      if (!leido.success) {
        motivos[CAMPO_DEL_NOMBRE_DESTINO] = leido.error.issues[0]?.message ?? MENSAJE_DE_VALIDACION
      }
      const medidas = medidasDelFormato(formato, { ancho: lado(ancho), alto: lado(alto) })
      if (!medidas.ok) {
        motivos[CAMPO_DEL_ANCHO_DESTINO] = medidas.error.mensaje
      }
      return Object.keys(motivos).length > 0 ? motivos : null
    },
    pedir: () =>
      enviarAccion(
        duplicar.executeAsync({
          idNuevo: intento,
          fuente: fuente.id,
          nombre,
          formato,
          ancho: personalizado ? lado(ancho) : null,
          alto: personalizado ? lado(alto) : null,
          documento: documento?.() ?? null,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: ({ id }) => {
      avisarLaCopia(`Listo: ${nombre} en ${formatoDe(formato).nombre}.`, () => {
        router.push(rutaDeLaPlantillaDeArte(id))
      })
      alCerrar()
    },
    campoDelRechazo: (error) => (error.causa ? (CAMPO_DEL_HINT[error.causa] ?? null) : null),
  })

  return {
    ...envio,
    destinos,
    formato,
    ancho,
    alto,
    nombre,
    personalizado,
    elegirFormato: (valor: ClaveDeFormato) => {
      setFormato(valor)
      envio.quitarMotivo(CAMPO_DEL_ANCHO_DESTINO)
    },
    escribirLado: (cual: 'ancho' | 'alto', valor: string) => {
      ;(cual === 'ancho' ? setAncho : setAlto)(valor)
      envio.quitarMotivo(CAMPO_DEL_ANCHO_DESTINO)
    },
    escribirNombre: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo(CAMPO_DEL_NOMBRE_DESTINO)
    },
  }
}
