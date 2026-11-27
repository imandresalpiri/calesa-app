'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  errorDelCodigo,
  normalizarCodigo,
} from '../../../entities/transporte/borrador-del-embarque'
import {
  avisoDeMover,
  destinosParaElegir,
  type TipoDeDestino,
} from '../../../entities/transporte/donde-viaja'
import type { EntidadesDeLaUnidad } from '../../../entities/transporte/lectura-de-la-unidad'
import type { LoteAplicado } from '../../../entities/transporte/repositorio-de-embarques'
import { tituloDelContenedor, tituloDelEmbarque } from '../../../entities/transporte/textos'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { ponerElVehiculoEnTransporte } from '../actions/poner-el-vehiculo-en-transporte'

export type ModoDeDondeViaja = 'elegir' | 'crear'

// Lo elegido de la lista: su id y cómo se nombra (el número del contenedor o el booking del embarque).
export type DestinoElegido = { tipo: TipoDeDestino; id: string; codigo: string }

export type NuevoDestino = { codigo: string; tipoDeContenedor: string; naviera: string }

const NUEVO_VACIO: NuevoDestino = { codigo: '', tipoDeContenedor: '', naviera: '' }
const MENSAJE_DE_VALIDACION = 'Revisa dónde viaja.'

type Args = {
  unidadId: string
  origenId: string
  // La versión del transporte leída (nula sin transporte): va con el pedido y un `PT409` queda hasta que cambia.
  actualizadoEn: string | null
  entidades: EntidadesDeLaUnidad
  usaContenedores: boolean
  abierto: boolean
  alCerrar: () => void
  // Trae la versión de ahora tras un conflicto (la lectura del hueco).
  releer: () => void
}

const nulo = (texto: string) => (texto === '' ? null : texto)

type Pedido = {
  origenId: string
  unidadId: string
  actualizadoEn: string | null
  tipo: TipoDeDestino
  // El elegido, o el id del intento para uno nuevo.
  id: string
  // Lo escrito para crear; nulo al elegir uno que ya existe.
  nuevo: NuevoDestino | null
  mover: boolean
}

// Al elegir, uno de la lista; al crear, su código con la forma de la base.
function validarDondeViaja(
  tipo: TipoDeDestino,
  destino: DestinoElegido | null,
  nuevo: NuevoDestino | null,
): Record<string, string> | null {
  if (nuevo === null) {
    return destino
      ? null
      : { elegido: tipo === 'contenedor' ? 'Elige un contenedor.' : 'Elige un embarque.' }
  }
  const error = errorDelCodigo(nuevo.codigo, tipo === 'contenedor' ? 'número' : 'booking')
  return error ? { codigo: error } : null
}

function pedirDondeViaja(p: Pedido): Promise<Envio<LoteAplicado>> {
  const codigo = p.nuevo ? normalizarCodigo(p.nuevo.codigo) : ''
  return enviarAccion(
    ponerElVehiculoEnTransporte({
      origenId: p.origenId,
      vehiculoId: p.unidadId,
      actualizadoEn: p.actualizadoEn,
      destino:
        p.tipo === 'contenedor'
          ? {
              tipo: 'contenedor',
              id: p.id,
              nuevo: p.nuevo ? { numero: codigo, tipo: nulo(p.nuevo.tipoDeContenedor) } : null,
            }
          : {
              tipo: 'embarque',
              id: p.id,
              nuevo: p.nuevo ? { booking: codigo, naviera_id: nulo(p.nuevo.naviera) } : null,
            },
      mover: p.mover,
    }),
    MENSAJE_DE_VALIDACION,
  )
}

// El formulario del modal «Dónde viaja»: elegir un contenedor o un embarque del origen, o crear uno con lo mínimo (número y tipo, o booking y naviera), y poner ahí la unidad
// (`ponerElVehiculoEnTransporte`, que crea con el id del intento y asigna con la versión). Si la unidad ya va en otro, el aviso lo dice antes de enviar y el botón pasa a «Moverlo»:
// eso es la confirmación. Si la base frena igual (`causa: 'mover'`: se movió desde que se leyó), su mensaje queda a la vista y el siguiente envío lleva `mover`.
export function useDondeViaja({
  unidadId,
  origenId,
  actualizadoEn,
  entidades,
  usaContenedores,
  abierto,
  alCerrar,
  releer,
}: Args) {
  const destinos = destinosParaElegir(usaContenedores)
  const [intento] = useState(() => crypto.randomUUID())
  const [tipo, setTipo] = useState<TipoDeDestino>(destinos[0] ?? 'embarque')
  const [modo, setModo] = useState<ModoDeDondeViaja>('elegir')
  const [elegido, setElegido] = useState<DestinoElegido | null>(null)
  const [nuevo, setNuevo] = useState<NuevoDestino>(NUEVO_VACIO)
  const [pideMover, setPideMover] = useState(false)

  const destino = modo === 'elegir' ? (elegido?.tipo === tipo ? elegido : null) : null
  // Antes de elegir ya dice dónde va hoy; elegir donde ya va lo calla.
  const avisoDeMoverlo = avisoDeMover(entidades, { tipo, id: destino?.id ?? intento })
  const mover = avisoDeMoverlo !== null || pideMover

  const validar = () => validarDondeViaja(tipo, destino, modo === 'crear' ? nuevo : null)

  const pedir = async (): Promise<Envio<LoteAplicado>> => {
    const envio = await pedirDondeViaja({
      origenId,
      unidadId,
      actualizadoEn,
      tipo,
      id: destino?.id ?? intento,
      nuevo: modo === 'crear' ? nuevo : null,
      mover,
    })
    // Respaldo de la base (`23514 hint mover`): la unidad se mudó desde que se leyó. Su mensaje se dice arriba y el próximo envío la mueve.
    if (!envio.ok && !('sinRed' in envio) && envio.error.causa === 'mover') {
      setPideMover(true)
    }
    return envio
  }

  const envio = useEnvioConVersion<LoteAplicado>({
    abierto,
    hayCambios: modo === 'elegir' ? destino !== null : nuevo.codigo.trim() !== '',
    version: actualizadoEn,
    validar,
    pedir,
    alGuardar: () => {
      const codigo = destino ? destino.codigo : normalizarCodigo(nuevo.codigo)
      avisarExito(
        `Va en: ${tipo === 'contenedor' ? tituloDelContenedor(codigo) : tituloDelEmbarque(codigo)}.`,
      )
      avisarCambioDeLaUnidad(unidadId)
      alCerrar()
    },
    recargar: releer,
  })

  return {
    ...envio,
    destinos,
    tipo,
    modo,
    elegido: destino,
    nuevo,
    avisoDeMover: avisoDeMoverlo,
    mover,
    cambiar: (a: { tipo?: TipoDeDestino; modo?: ModoDeDondeViaja }) => {
      if (a.tipo) setTipo(a.tipo)
      if (a.modo) setModo(a.modo)
      setPideMover(false)
      envio.quitarMotivo('elegido')
      envio.quitarMotivo('codigo')
    },
    elegir: (d: DestinoElegido) => {
      setElegido(d)
      setPideMover(false)
      envio.quitarMotivo('elegido')
    },
    escribir: (cambios: Partial<NuevoDestino>) => {
      setNuevo((antes) => ({ ...antes, ...cambios }))
      if ('codigo' in cambios) envio.quitarMotivo('codigo')
    },
  }
}
