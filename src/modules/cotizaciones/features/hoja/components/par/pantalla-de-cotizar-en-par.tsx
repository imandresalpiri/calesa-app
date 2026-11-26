'use client'

import { useMemo, useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../../entities/apertura'
import { claveDeLaHoja, claveDelBorrador, claveEnPar } from '../../../../entities/claves-de-la-hoja'
import type { HojaLista } from '../../../../entities/hoja'
import type { ParDeHoja } from '../../../../entities/hoja-en-par'
import type {
  EleccionesDeLaHoja,
  ObligatoriosAlCotizar,
} from '../../../../entities/obligatorios-al-cotizar'
import type { AperturaDeHoja } from '../../hooks/use-hoja'
import { useGuardadoEnPar } from '../../hooks/use-guardado-en-par'
import { useSoltarLoAbierto } from '../../hooks/urls-de-la-hoja'
import { useTituloDeLaCotizacion } from '../../hooks/use-titulo-de-la-cotizacion'
import { useMarcaDeLaNueva } from '../../../privada/hooks/use-marca-de-la-nueva'
import { HermanasGuardadas } from './hermanas-guardadas'
import { HojaEnPar } from './hoja-en-par'

type Props = {
  hoja: HojaLista & { par: ParDeHoja }
  iniciales: readonly [RecalculoInicial, RecalculoInicial]
  vehiculoId: string | null
  vehiculoSoltado: boolean
  obligatorios: ObligatoriosAlCotizar
  elecciones: EleccionesDeLaHoja
  leadId: string | null
  personaId: string
  seEligen?: readonly string[]
}

// De dónde calcula cada columna de la hoja nueva en par: la hoja abierta y el vehículo, con la opción de su columna (la pone la base).
function useAperturas(hoja: Props['hoja'], vehiculoId: string | null) {
  const { id: origenId } = hoja.origen
  const { abierta, par } = hoja
  return useMemo(
    () =>
      par.opciones.map((o): AperturaDeHoja => ({
        de: { tipo: 'abierta', origenId, abierta, vehiculoId, opcion: o.clave },
      })) as unknown as readonly [AperturaDeHoja, AperturaDeHoja],
    [origenId, abierta, par, vehiculoId],
  )
}

// Lo que congela el marco mientras guarda: las props de la hoja (una action que renueva la sesión dibuja otra hoja abierta).
function useVistasCongeladas(
  props: Omit<Props, 'leadId' | 'personaId' | 'seEligen'>,
  congelada: boolean,
) {
  const [vistas, setVistas] = useState(props)
  const cambiaron =
    vistas.hoja !== props.hoja ||
    vistas.iniciales !== props.iniciales ||
    vistas.vehiculoId !== props.vehiculoId
  if (!congelada && cambiaron) setVistas(props)
  return congelada ? vistas : props
}

function useElegibles(seEligen: readonly string[] | undefined) {
  const claves = seEligen?.join('\u0000') ?? ''
  return useMemo(() => (claves === '' ? undefined : new Set(claves.split('\u0000'))), [claves])
}

// El guardado del par con lo que se borra al guardar: el borrador, lo abierto en la URL y el título (vuelve a automático).
function useGuardadoDelMarco(deLaPestana: {
  personaId: string
  origenId: string
  leadId: string | null
  vehiculoId: string | null
}) {
  const borrador = claveEnPar(claveDelBorrador(deLaPestana))
  const borrarElBorrador = () => {
    guardarBorradorDeEstado(window.sessionStorage, borrador, {})
  }
  const soltarLoAbierto = useSoltarLoAbierto()
  const titulo = useTituloDeLaCotizacion()
  const guardado = useGuardadoEnPar({
    hoja: deLaPestana,
    alGuardar: () => {
      borrarElBorrador()
      soltarLoAbierto()
      titulo?.alGuardar()
    },
  })
  return { guardado, borrador, borrarElBorrador }
}

// El marco de la hoja nueva en par (glosario: «Variante en par»): como el de la hoja de siempre, con el guardado del par (`cotizacion_crear_en_par`) y lo guardado de
// las dos. Mientras guarda congela las props de la hoja.
export function PantallaDeCotizarEnPar({ leadId, personaId, seEligen, ...props }: Props) {
  const [vuelta, setVuelta] = useState(0)
  const elegibles = useElegibles(seEligen)
  const { guardado, borrador, borrarElBorrador } = useGuardadoDelMarco({
    personaId,
    origenId: props.hoja.origen.id,
    leadId,
    vehiculoId: props.vehiculoId,
  })
  const hoja = useVistasCongeladas(props, guardado.estado.tipo === 'guardando')
  const aperturas = useAperturas(hoja.hoja, hoja.vehiculoId)
  const clave = claveDeLaHoja({
    formulaId: hoja.hoja.formula.id,
    vehiculoId: hoja.vehiculoId,
    vuelta,
    abierta: hoja.hoja.abierta,
  })
  const [claveVista, setClaveVista] = useState(clave)
  if (clave !== claveVista) {
    setClaveVista(clave)
    guardado.olvidarAviso()
  }
  const privada = useMarcaDeLaNueva(guardado.ocupado)
  const guardada = guardado.estado.tipo === 'guardada' ? guardado.estado : null
  if (guardada) {
    return (
      <HermanasGuardadas
        cotizacion={guardada.cotizacion}
        par={hoja.hoja.par}
        fueReenvio={guardada.fueReenvio}
        alCotizarOtra={() => {
          borrarElBorrador()
          guardado.reiniciar()
        }}
      />
    )
  }
  return (
    <HojaEnPar
      key={clave}
      hoja={hoja.hoja}
      par={hoja.hoja.par}
      iniciales={hoja.iniciales}
      aperturas={aperturas}
      vehiculoId={hoja.vehiculoId}
      vehiculoSoltado={hoja.vehiculoSoltado}
      leadId={leadId}
      obligatorios={hoja.obligatorios}
      elecciones={hoja.elecciones}
      seEligen={elegibles}
      borrador={{ clave: borrador, alDescartar: () => setVuelta((v) => v + 1) }}
      guardado={guardado}
      privada={privada}
    />
  )
}
