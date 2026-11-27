'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  esquemaDelNombreDeArte,
  MENSAJE_DEL_NOMBRE,
  nombreDesdeElArchivo,
} from '../../../entities/nombres'
import type { AmbitoDeImagen, ImagenPreparada } from '../../../entities/tipos'
import { subirImagen } from '../../../composicion.client'
import { crearImagenDeArte } from '../actions/crear-imagen-de-arte'
import { prepararImagen } from './preparar-imagen'

export const CAMPO_DEL_ARCHIVO = 'subir-imagen-archivo'
export const CAMPO_DEL_NOMBRE_DE_LA_SUBIDA = 'subir-imagen-nombre'
const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'
const FALTA_EL_ARCHIVO = 'Elige una imagen.'

type Elegida =
  | { estado: 'preparando'; nombre: string }
  | { estado: 'lista'; nombre: string; preparada: ImagenPreparada }
  | { estado: 'invalida'; nombre: string; motivo: string }

// El `hint` de la base → el campo del formulario.
const CAMPO_DEL_HINT: Record<string, string> = {
  archivo: CAMPO_DEL_ARCHIVO,
  nombre: CAMPO_DEL_NOMBRE_DE_LA_SUBIDA,
}

// «Subir imagen» (`?panel=subir`): al elegir el archivo se prepara en el navegador (se valida, se reduce si hace falta y se saca su miniatura)
// y el motivo, si no sirve, se dice junto a la zona. El nombre sale del archivo mientras no se escriba otro. Al guardar se suben el original y
// la miniatura por su hash y la action crea la fila, con el id del intento (un reintento no crea dos). Personal por defecto.
export function useSubidaDeImagen({ alCerrar }: { alCerrar: () => void }) {
  const [intento] = useState(() => crypto.randomUUID())
  const [elegida, setElegida] = useState<Elegida | null>(null)
  const [nombre, setNombre] = useState('')
  const [escrito, setEscrito] = useState(false)
  const [ambito, setAmbito] = useState<AmbitoDeImagen>('personal')
  const crear = useAction(crearImagenDeArte)

  async function pedir(): Promise<Envio<{ id: string }>> {
    if (elegida?.estado !== 'lista') {
      return fallo('validacion', FALTA_EL_ARCHIVO, 'archivo')
    }
    const subida = await subirImagen(elegida.preparada)
    if (!subida.ok) {
      return subida
    }
    return enviarAccion(
      crear.executeAsync({ id: intento, nombre, ambito, ...subida.data }),
      MENSAJE_DE_VALIDACION,
    )
  }

  const envio = useEnvioDeModal<{ id: string }>({
    abierto: true,
    hayCambios: elegida !== null || nombre !== '' || ambito !== 'personal',
    validar: () => {
      const motivos: Record<string, string> = {}
      if (elegida === null) {
        motivos[CAMPO_DEL_ARCHIVO] = FALTA_EL_ARCHIVO
      } else if (elegida.estado === 'invalida') {
        motivos[CAMPO_DEL_ARCHIVO] = elegida.motivo
      }
      if (!esquemaDelNombreDeArte.safeParse(nombre).success) {
        motivos[CAMPO_DEL_NOMBRE_DE_LA_SUBIDA] = MENSAJE_DEL_NOMBRE
      }
      return Object.keys(motivos).length > 0 ? motivos : null
    },
    pedir,
    alGuardar: () => {
      avisarExito('Imagen guardada en la biblioteca.')
      alCerrar()
    },
    campoDelRechazo: (error) => (error.causa ? (CAMPO_DEL_HINT[error.causa] ?? null) : null),
  })

  async function elegir(archivo: File) {
    envio.quitarMotivo(CAMPO_DEL_ARCHIVO)
    setElegida({ estado: 'preparando', nombre: archivo.name })
    if (!escrito) {
      setNombre(nombreDesdeElArchivo(archivo.name))
      envio.quitarMotivo(CAMPO_DEL_NOMBRE_DE_LA_SUBIDA)
    }
    const preparada = await prepararImagen(archivo)
    // Si mientras tanto se eligió otro, éste ya no cuenta.
    setElegida((antes) =>
      antes?.estado !== 'preparando' || antes.nombre !== archivo.name
        ? antes
        : preparada.ok
          ? { estado: 'lista', nombre: archivo.name, preparada: preparada.data }
          : { estado: 'invalida', nombre: archivo.name, motivo: preparada.error.mensaje },
    )
  }

  return {
    ...envio,
    elegida,
    nombre,
    ambito,
    // Mientras se prepara no se puede guardar.
    sinPoderEnviar: elegida?.estado === 'preparando',
    elegir: (archivos: File[]) => {
      const [archivo] = archivos
      if (archivo) {
        void elegir(archivo)
      }
    },
    escribirNombre: (valor: string) => {
      setNombre(valor)
      setEscrito(true)
      envio.quitarMotivo(CAMPO_DEL_NOMBRE_DE_LA_SUBIDA)
    },
    elegirAmbito: setAmbito,
  }
}

export type SubidaDeImagen = ReturnType<typeof useSubidaDeImagen>
