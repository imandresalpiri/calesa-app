'use client'

import { cn } from 'cn'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Opciones } from '@/shared/ui/opciones'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import { TIPOS_ADMITIDOS } from '../../../entities/imagenes'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/nombres'
import { MOTIVO_SIN_GESTIONAR } from '../../../entities/permisos-de-artes'
import type { AmbitoDeImagen } from '../../../entities/tipos'
import {
  CAMPO_DEL_ARCHIVO,
  CAMPO_DEL_NOMBRE_DE_LA_SUBIDA,
  useSubidaDeImagen,
  type SubidaDeImagen,
} from '../hooks/use-subida-de-imagen'

type Props = {
  // Si quien sube puede guardarla en la biblioteca de la empresa (`artes.empresa.gestionar`).
  gestiona: boolean
  alCerrar: () => void
}

const AMBITOS: readonly { valor: AmbitoDeImagen; etiqueta: string }[] = [
  { valor: 'personal', etiqueta: 'Personal' },
  { valor: 'empresa', etiqueta: 'De la empresa' },
]

// La línea reservada bajo la zona: el motivo si el archivo no sirve, «Preparando…» mientras se reduce, o cuál quedó elegido. Nunca cambia de
// alto.
function LineaDelArchivo({ subida }: { subida: SubidaDeImagen }) {
  const { elegida } = subida
  const motivo =
    subida.errores[CAMPO_DEL_ARCHIVO] ?? (elegida?.estado === 'invalida' ? elegida.motivo : null)
  const texto =
    motivo ??
    (elegida === null
      ? null
      : elegida.estado === 'preparando'
        ? `Preparando «${elegida.nombre}»…`
        : elegida.estado === 'lista'
          ? `Elegida: ${elegida.nombre} (${String(elegida.preparada.ancho)} × ${String(elegida.preparada.alto)} px).`
          : null)
  return (
    <p
      id={CAMPO_DEL_ARCHIVO}
      role={motivo ? 'alert' : 'status'}
      className={cn(
        'min-h-5 text-(length:--text-sm) break-all',
        motivo ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)',
      )}
    >
      {texto}
    </p>
  )
}

// «Subir imagen» (`?panel=subir`): la zona para elegir o soltar el archivo, su línea reservada, el nombre (sale del archivo) y «Dónde»:
// Personal o De la empresa. Sin el permiso de la empresa, «Dónde» queda en Personal, apagado y con su motivo. Quien lo monta lo dibuja sólo
// mientras la URL lo pide: cada apertura empieza de cero.
export function ModalSubirImagen({ gestiona, alCerrar }: Props) {
  const subida = useSubidaDeImagen({ alCerrar })
  return (
    <ModalDeFormulario
      id="subir-imagen-de-arte"
      abierto
      alCerrar={alCerrar}
      titulo="Subir imagen"
      descripcion="Queda en la biblioteca para usarla en las plantillas de arte."
      formulario={subida}
      guardar={{ etiqueta: 'Subir imagen', enCurso: 'Subiendo…' }}
    >
      <div className="grid gap-1.5">
        <ZonaDeArchivos
          aceptar={TIPOS_ADMITIDOS.join(',')}
          alElegir={subida.elegir}
          etiquetaDeElegir="Elegir imagen"
          ayuda="Arrastra aquí una imagen PNG, WebP, JPG o SVG de hasta 10 MB."
        />
        <LineaDelArchivo subida={subida} />
      </div>
      <Campo
        nombre={CAMPO_DEL_NOMBRE_DE_LA_SUBIDA}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
        value={subida.nombre}
        onChange={(evento) => {
          subida.escribirNombre(evento.target.value)
        }}
        error={subida.errores[CAMPO_DEL_NOMBRE_DE_LA_SUBIDA]}
      />
      <Opciones
        etiqueta="Dónde"
        opciones={AMBITOS}
        valor={subida.ambito}
        alCambiar={subida.elegirAmbito}
        deshabilitado={!gestiona}
        ayuda={
          gestiona
            ? 'Personal: sólo la ves tú. De la empresa: la usa todo el equipo.'
            : `Personal: sólo la ves tú. ${MOTIVO_SIN_GESTIONAR}`
        }
      />
    </ModalDeFormulario>
  )
}
