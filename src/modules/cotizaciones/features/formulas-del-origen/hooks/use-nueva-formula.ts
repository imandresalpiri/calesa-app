'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { nombreDeLaFormula } from '../../../entities/formula-del-origen'
import { claveDeLosAvisos } from '../../../entities/avisos-de-la-copia'
import { PANEL_DE_LA_INFORMACION } from '../../../entities/informacion-de-la-formula'
import { nombreDeLaCopia, type Pieza } from '../../../entities/formulas-del-origen/copiar'
import type { FormulaCreada } from '../../../entities/formulas-del-origen/resultado'
import { crearFormulaDelOrigen } from '../actions/crear-formula'
import { useFuenteDeLaCopia, type ComoEmpieza } from './use-fuente-de-la-copia'

type Args = {
  origen: { id: string; nombre: string }
  // `?copia=<id>`: «Copiar» desde el «⋯» de una fórmula de este origen (también una archivada).
  copiaInicial: string | null
  comoInicial?: ComoEmpieza | null
  // El nombre con el que abre (la puesta en marcha propone el del origen); se puede cambiar.
  nombreInicial?: string
  // Con la fórmula ya creada; sin él, abre su planilla.
  alCrear?: (id: string) => void
}

// Los avisos de la copia esperan a la planilla en la pestaña (los lee `useAvisosDeLaCopia()` y los dibuja el modal «Información de la fórmula»).
function guardarLosAvisos(creada: FormulaCreada) {
  if (creada.avisos.length === 0) return
  try {
    sessionStorage.setItem(claveDeLosAvisos(creada.id), JSON.stringify(creada.avisos))
  } catch {
    // Sin `sessionStorage` (modo privado lleno): la planilla abre sin los avisos.
  }
}

// Elegir otra fuente borra los motivos que dejan de valer.
function eleccionesQueLimpian(
  fuente: ReturnType<typeof useFuenteDeLaCopia>,
  quitar: (...claves: string[]) => void,
) {
  return {
    elegirComo: (valor: ComoEmpieza) => {
      fuente.elegirComo(valor)
      quitar('origen', 'copia', 'pieza')
    },
    elegirOtroOrigen: (id: string | null) => {
      fuente.elegirOtroOrigen(id)
      quitar('origen', 'copia')
    },
    elegirCopia: (id: string | null) => {
      fuente.elegirCopia(id)
      quitar('copia', 'pieza')
    },
    elegirPieza: (valor: Pieza) => {
      fuente.elegirPieza(valor)
      quitar('pieza')
    },
  }
}

// El estado del modal «Nueva fórmula»: qué copia (`useFuenteDeLaCopia`) y el nombre (el de la copia con « (copia)» hasta que se escribe otro). El id del intento
// vive con el modal (cada apertura, uno; un reintento no crea dos). Al crear, guarda los avisos de la copia y abre su planilla (con avisos, con la
// información de la fórmula abierta).
export function useNuevaFormula({
  origen,
  copiaInicial,
  comoInicial = null,
  nombreInicial = '',
  alCrear,
}: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const fuente = useFuenteDeLaCopia(origen.id, copiaInicial, comoInicial)
  const [nombre, setNombre] = useState(nombreInicial)
  const [nombreEscrito, setNombreEscrito] = useState(nombreInicial !== '')
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)
  const crear = useAction(crearFormulaDelOrigen)
  const { copia } = fuente
  const nombreMostrado = nombreEscrito || copia === null ? nombre : nombreDeLaCopia(copia.nombre)

  const envio = useEnvioDeModal<FormulaCreada>({
    abierto: true,
    hayCambios: fuente.como !== (comoInicial ?? 'blanco') || nombre.trim() !== nombreInicial.trim(),
    validar: () => {
      const elNombre = nombreDeLaFormula(nombreMostrado)
      const motivos = {
        ...fuente.motivos(),
        ...(elNombre.ok ? {} : { nombre: elNombre.error.mensaje }),
      }
      return Object.keys(motivos).length > 0 ? motivos : null
    },
    pedir: async () => {
      const hecho = await enviarAccion(
        crear.executeAsync({
          id: intento,
          origenId: origen.id,
          nombre: nombreMostrado.trim(),
          copiaDe: copia?.id ?? null,
          pieza: fuente.pieza ?? 'publicada',
          origenDeLaCopia: fuente.origenDeLaCopia,
        }),
        'No se pudo crear la fórmula.',
      )
      setRechazo(hecho.ok || 'sinRed' in hecho ? null : hecho.error)
      return hecho
    },
    alGuardar: (creada) => {
      guardarLosAvisos(creada)
      avisarExito(`Creaste «${nombreMostrado.trim()}».`)
      // Se navega sin cerrar antes el panel: el cierre por la URL pisaría la navegación (docs/LECCIONES.md › «Interfaz»).
      if (alCrear) {
        alCrear(creada.id)
        return
      }
      // Con avisos de la copia, la planilla abre con «Información de la fórmula», donde se leen.
      router.push(
        rutaDeLaFormula(
          origen.id,
          creada.id,
          'planilla',
          creada.avisos.length > 0 ? { [CLAVE_DE_PANEL]: PANEL_DE_LA_INFORMACION } : undefined,
        ),
      )
    },
  })
  const quitar = (...claves: string[]) => {
    for (const clave of claves) envio.quitarMotivo(clave)
  }

  return {
    ...envio,
    ...fuente,
    ...eleccionesQueLimpian(fuente, quitar),
    nombre: nombreMostrado,
    escribirNombre: (valor: string) => {
      setNombre(valor)
      setNombreEscrito(true)
      quitar('nombre')
    },
    // El último rechazo de la base (su causa dice si hay una salida, como «Abrir Monedas»).
    rechazo,
  }
}
