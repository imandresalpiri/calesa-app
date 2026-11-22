'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useReducer, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  columnasParaEnviar,
  edicionDeUnaTablaNueva,
  editarColumnas,
} from '../../../entities/tablas/edicion-de-columnas'
import { LARGO_MAXIMO_DEL_NOMBRE, claveDeLaTabla } from '../../../entities/tablas/estructura'
import { rutaDeLasTablas, type LugarDeLasTablas } from '../../../entities/tablas/rutas'
import { validarColumnas } from '../../../entities/tablas/validacion-de-columnas'
import { crearTabla } from '../actions/crear-tabla'

export type ParaQuien = 'origen' | 'compartida'

type Opciones = {
  // El origen del drawer: con «Sólo de <origen>» la tabla es suya; con «Compartida con todos los orígenes», sin origen.
  origenId: string
  // Dónde se dibujan las tablas: al entrar se abre ahí la nueva.
  lugar: LugarDeLasTablas
}

const MENSAJE_DE_VALIDACION = 'Revisa el nombre y las columnas.'
const SIN_NOMBRE = 'La tabla necesita un nombre.'
const NOMBRE_LARGO = `El nombre pasa de ${String(LARGO_MAXIMO_DEL_NOMBRE)} letras.`
const SIN_CLAVE = 'El nombre de la tabla necesita al menos dos letras o números.'

// El nombre como lo recorta la base (`btrim`: sólo el espacio ASCII).
const recortado = (nombre: string) => nombre.replace(/^ +| +$/g, '')

function rechazoDelNombre(nombre: string): string | null {
  const limpio = recortado(nombre)
  if (limpio === '') return SIN_NOMBRE
  if ([...limpio].length > LARGO_MAXIMO_DEL_NOMBRE) return NOMBRE_LARGO
  return claveDeLaTabla(limpio) === null ? SIN_CLAVE : null
}

// Un rechazo con un campo que el panel dibuja (el nombre o una columna); otro (`origen`) va arriba.
const tieneCampoALaVista = (porCampo: Record<string, string>) =>
  Object.keys(porCampo).some((campo) => campo === 'nombre' || campo.startsWith('columnas'))

// «Nueva tabla» (`?panel=nueva-tabla`): el nombre (y la clave que sale de él), para quién es y las columnas. El id del intento nace con el panel (quien lo monta le
// da `key` por apertura): repetir el envío tras una pérdida de red devuelve la misma tabla. Lo que la base rechaza vuelve junto a su campo; al entrar, abre la tabla
// nueva para sumarle filas.
export function useNuevaTabla({ origenId, lugar }: Opciones) {
  const router = useRouter()
  const [id] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState('')
  const [para, setPara] = useState<ParaQuien>('origen')
  const [edicion, editar] = useReducer(editarColumnas, undefined, edicionDeUnaTablaNueva)
  const [porCampo, setPorCampo] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const crear = useAction(crearTabla)
  const envio = useUnEnvioALaVez()

  const destino = para === 'origen' ? origenId : null
  const columnas = columnasParaEnviar(edicion)
  const hayCambios = nombre.trim() !== '' || columnas.some((c) => c.etiqueta !== '')

  async function enviar(): Promise<boolean> {
    const delNombre = rechazoDelNombre(nombre)
    const deLasColumnas = validarColumnas(columnas)
    if (delNombre || deLasColumnas) {
      setPorCampo({
        ...(delNombre ? { nombre: delNombre } : {}),
        ...(deLasColumnas ? { [deLasColumnas.camino]: deLasColumnas.mensaje } : {}),
      })
      setError(null)
      return false
    }
    const hecho = await envio.mandar(() =>
      enviarAccion(
        crear.executeAsync({ id, origenId: destino, nombre: recortado(nombre), columnas }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (hecho === null) return false
    if (hecho.ok) {
      setPorCampo({})
      setError(null)
      // La ruta de la tabla nueva ya no lleva `?panel=`: cierra el panel. Cerrarlo antes escribiría la URL después y pisaría esta.
      avisarExito(`Creaste «${recortado(nombre)}». Suma sus filas y publícala.`)
      router.replace(rutaDeLasTablas(lugar, hecho.data.id))
      return true
    }
    if ('sinRed' in hecho) {
      setError(MENSAJE_SIN_CONEXION)
      return false
    }
    if (hecho.porCampo && tieneCampoALaVista(hecho.porCampo)) {
      setPorCampo(hecho.porCampo)
      setError(null)
    } else if (['sin_permiso', 'regla', 'duplicado'].includes(hecho.error.codigo)) {
      setPorCampo({})
      setError(hecho.error.mensaje)
    } else {
      avisarError(hecho.error)
    }
    return false
  }

  return {
    nombre,
    escribirNombre: (valor: string) => {
      setNombre(valor)
      setPorCampo(({ nombre: _, ...resto }) => resto)
    },
    clave: claveDeLaTabla(recortado(nombre)),
    para,
    setPara,
    edicion,
    editar: (accion: Parameters<typeof editarColumnas>[1]) => {
      editar(accion)
      setPorCampo(({ nombre: delNombre }): Record<string, string> =>
        delNombre === undefined ? {} : { nombre: delNombre },
      )
    },
    porCampo,
    error,
    enCurso: envio.enCurso,
    hayCambios,
    enviar,
  }
}

export type NuevaTabla = ReturnType<typeof useNuevaTabla>
