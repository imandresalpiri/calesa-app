'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { prepararLogo } from '../../../composicion.client'
import {
  LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO,
  nombresSugeridos,
  type VarianteDelLogo,
} from '../../../entities/logos'
import { TIPOS_DE_LOGO } from '../../../entities/marca'
import { useFormularioDeLogo, type FormularioDeLogo } from '../hooks/use-formulario-de-logo'
import type { Logos } from '../hooks/use-logos'
import { MiniaturaDeLogo } from './miniatura-de-logo'

const ID = 'logo-nuevo'

type Props = {
  abierto: boolean
  alCerrar: () => void
  logos: Logos
  // Nulo = «Subir un logo».
  original: VarianteDelLogo | null
  noDisponible: string | null
}

// Una dirección local para mostrar el archivo elegido, que se libera al cambiarlo o al salir.
function useUrlDeArchivo(archivo: Blob | null): string | null {
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [url])
  return url
}

// La zona del archivo: elegirlo sólo lo revisa y lo muestra sobre el damero; se sube al guardar. Si el tipo, el peso o el SVG no sirven, el motivo queda acá
// y no cambia nada.
function ZonaDelArchivo({ formulario }: { formulario: FormularioDeLogo }) {
  const selector = useRef<HTMLInputElement>(null)
  const { archivo, errores } = formulario
  const vista = useUrlDeArchivo(archivo?.contenido ?? null)
  const motivo = errores.archivo
  async function elegir(elegido: File) {
    const listo = await prepararLogo(elegido)
    if (listo.ok) {
      formulario.elegirArchivo(listo.data)
    } else {
      formulario.rechazarArchivo(listo.error.mensaje)
    }
  }
  return (
    <div className="grid gap-1.5">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Archivo</span>
      <div className="flex flex-wrap items-center gap-4">
        <MiniaturaDeLogo url={vista} alt="Vista previa del logo elegido" lado={64} />
        <input
          ref={selector}
          id={`${ID}-archivo`}
          type="file"
          accept={TIPOS_DE_LOGO}
          aria-label="Elegir el archivo del logo"
          aria-invalid={motivo ? true : undefined}
          aria-describedby={motivo ? `${ID}-archivo-error` : `${ID}-archivo-ayuda`}
          className="sr-only"
          disabled={formulario.enCurso}
          onChange={(evento) => {
            const elegido = evento.target.files?.[0]
            if (elegido) {
              void elegir(elegido)
            }
            // Para que elegir dos veces el mismo archivo vuelva a avisar.
            evento.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-8"
          disabled={formulario.enCurso}
          onClick={() => selector.current?.click()}
        >
          {archivo ? 'Cambiar el archivo' : 'Elegir el archivo'}
        </Button>
      </div>
      {motivo ? (
        <p
          id={`${ID}-archivo-error`}
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
      {archivo?.aviso ? (
        <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{archivo.aviso}</p>
      ) : null}
      <p id={`${ID}-archivo-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
        SVG, PNG o WebP, hasta 1 MB. Conserva la transparencia; si pasa de 1024 px se reduce.
      </p>
    </div>
  )
}

// «Subir un logo» (`?panel=nuevo-logo`) y «Renombrar» (`?panel=renombrar-logo&logo=<id>`). El id del intento nace al abrir y se conserva en cada
// reintento: guardar dos veces lo mismo no suma otro logo. El contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda,
// el conflicto con «Recargar» que conserva lo tipeado) es de `ModalDeFormulario`. Quien lo monta le da una `key` por apertura.
export function ModalDeLogo({ abierto, alCerrar, logos, original, noDisponible }: Props) {
  const [intento] = useState(() => crypto.randomUUID())
  const formulario = useFormularioDeLogo({
    original,
    lista: logos.lista,
    abierto,
    alCerrar,
    enCurso: logos.enCurso,
    mandar: (nombre, archivo) =>
      original
        ? logos.renombrar(original, nombre)
        : archivo
          ? logos.crear(intento, nombre, archivo)
          : Promise.resolve(null),
  })
  const sugeridos = original ? [] : nombresSugeridos(logos.lista)
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? `Renombrar «${original.nombre}»` : 'Subir un logo'}
      descripcion={
        original
          ? 'El nombre se ve en la lista y donde se elige el logo.'
          : 'Suma una versión del logo (ícono, monocromo…). Lo ve quien elige un logo en la ventana de cámara.'
      }
      focoInicial={() => document.getElementById(`${ID}-nombre`)}
      focoAlCerrar={() => false}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Guardar logo', enCurso: 'Subiendo…' }
      }
    >
      {original ? null : <ZonaDelArchivo formulario={formulario} />}
      <Campo
        nombre={`${ID}-nombre`}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribirNombre(evento.target.value)
        }}
        error={formulario.errores.nombre}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO)} caracteres. No se repite, aunque cambien las mayúsculas o las tildes.`}
      />
      {sugeridos.length > 0 ? (
        <div role="group" aria-label="Nombres sugeridos" className="flex flex-wrap gap-2">
          {sugeridos.map((sugerido) => (
            <Button
              key={sugerido}
              type="button"
              variant="outline"
              className="h-11 md:h-8"
              onClick={() => {
                formulario.escribirNombre(sugerido)
              }}
            >
              {sugerido}
            </Button>
          ))}
        </div>
      ) : null}
    </ModalDeFormulario>
  )
}
