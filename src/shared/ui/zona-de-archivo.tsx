'use client'

import { FileTextIcon, Loader2Icon, UploadIcon } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { cn } from 'cn'
import type { Resultado } from '@/shared/lib/errores'
import { Button } from './button'
import { MiniaturaDeArchivo } from './miniatura-de-archivo'
import type { ArchivoDeLaZona } from './use-archivo-de-la-zona'

type Props = {
  // El nombre de la zona para quien no la ve («Comprobante»).
  etiqueta: string
  // Lo que dice la zona vacía y su ayuda: «Arrastra aquí el comprobante o elígelo.» y «PDF o imagen de hasta 10 MB.»
  vacio: string
  ayuda: string
  // `accept` del selector del sistema; lo que se suelta lo valida quien sube.
  tipos: string
  archivo: ArchivoDeLaZona | null
  pedirUrl: () => Promise<Resultado<string>>
  subiendo: boolean
  error: string | null
  alReintentar?: () => void
  deshabilitada: boolean
  // Sólo se mira: sin elegir, reemplazar ni quitar (un pago confirmado). Sin archivo, una línea.
  soloLectura?: boolean
  textoSinArchivo?: string
  alElegir: (archivo: File) => void
  alQuitar: () => void
  alVer: () => void
}

const BOTON = 'h-11 md:h-8'

function Vacia({
  vacio,
  ayuda,
  alPedir,
  deshabilitada,
}: Pick<Props, 'vacio' | 'ayuda' | 'deshabilitada'> & { alPedir: () => void }) {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-4 text-center">
      <UploadIcon aria-hidden className="size-6 text-(--color-ink-soft)" />
      <p className="text-(length:--text-sm) text-(--color-ink)">{vacio}</p>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{ayuda}</p>
      <Button
        type="button"
        variant="outline"
        className={BOTON}
        disabled={deshabilitada}
        onClick={alPedir}
      >
        Elegir archivo
      </Button>
    </div>
  )
}

function ConArchivo(props: Props & { archivo: ArchivoDeLaZona; alPedir: () => void }) {
  const { archivo, deshabilitada, soloLectura = false } = props
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={props.alVer}
        className="shrink-0 cursor-pointer rounded-lg"
      >
        <MiniaturaDeArchivo archivo={archivo} pedirUrl={props.pedirUrl} />
      </button>
      <div className="grid min-w-0 flex-1 basis-40 gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-(length:--text-sm) font-medium break-all text-(--color-ink)">
          <FileTextIcon aria-hidden className="size-4 shrink-0 text-(--color-ink-soft)" />
          {archivo.nombre}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className={BOTON} onClick={props.alVer}>
            Ver comprobante
          </Button>
          {soloLectura ? null : (
            <>
              <Button
                type="button"
                variant="outline"
                className={BOTON}
                disabled={deshabilitada}
                onClick={props.alPedir}
              >
                Reemplazar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={BOTON}
                disabled={deshabilitada}
                onClick={props.alQuitar}
              >
                Quitar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Elegir (botón y selector) y soltar (arrastrar encima): lo mismo en la zona vacía y en la llena. Con la zona bloqueada no se elige ni se suelta nada.
function useElegirOSoltar(bloqueada: boolean, alElegir: (archivo: File) => void) {
  const [encima, setEncima] = useState(false)
  return {
    encima,
    alCambiar: (evento: ChangeEvent<HTMLInputElement>) => {
      const elegido = evento.target.files?.[0]
      // Sin esto, elegir dos veces el mismo archivo no avisa la segunda.
      evento.target.value = ''
      if (elegido) {
        alElegir(elegido)
      }
    },
    alPasar: (evento: DragEvent<HTMLDivElement>) => {
      // Sin esto el navegador abre el archivo en vez de soltarlo acá.
      evento.preventDefault()
      setEncima(!bloqueada)
    },
    alSalir: () => {
      setEncima(false)
    },
    alSoltar: (evento: DragEvent<HTMLDivElement>) => {
      evento.preventDefault()
      setEncima(false)
      const soltado = evento.dataTransfer.files[0]
      if (!bloqueada && soltado) {
        alElegir(soltado)
      }
    },
  }
}

function Contenido(props: Props & { alPedir: () => void }) {
  if (props.subiendo) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        <Loader2Icon aria-hidden className="size-4 animate-spin" />
        Subiendo…
      </p>
    )
  }
  return props.archivo ? (
    <ConArchivo {...props} archivo={props.archivo} />
  ) : (
    <Vacia
      vacio={props.vacio}
      ayuda={props.ayuda}
      deshabilitada={props.deshabilitada}
      alPedir={props.alPedir}
    />
  )
}

// El renglón del error y de «Reintentar», con su alto reservado aunque no haya nada.
function RenglonDelError({ error, alReintentar }: Pick<Props, 'error' | 'alReintentar'>) {
  return (
    <p
      role={error ? 'alert' : undefined}
      className="flex min-h-5 flex-wrap items-center gap-x-2 text-(length:--text-sm) text-(--color-peligro-ink)"
    >
      {error}
      {error && alReintentar ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="-my-3 h-11 md:my-0 md:h-6"
          onClick={alReintentar}
        >
          Reintentar
        </Button>
      ) : null}
    </p>
  )
}

// La zona de un archivo de un formulario o de un panel (el comprobante de un pago o de una compra): siempre a la vista, vacía o llena, con el MISMO alto (`min-h-44`) para que subir,
// reemplazar o quitar no mueva nada. Se elige con el botón, se suelta encima o, en el celular, con el selector del sistema. Vacía dice dónde soltarlo; con archivo, su vista previa
// (miniatura de una imagen, icono de un PDF), «Ver», «Reemplazar» y «Quitar». El error y «Reintentar» tienen su renglón reservado debajo. Sube quien la usa (`useArchivoDeLaZona`).
export function ZonaDeArchivo(props: Props) {
  const { soloLectura = false } = props
  const bloqueada = props.deshabilitada || props.subiendo || soloLectura
  const z = useElegirOSoltar(bloqueada, props.alElegir)
  const entrada = useRef<HTMLInputElement>(null)

  if (soloLectura && props.archivo === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {props.textoSinArchivo ?? 'Sin comprobante.'}
      </p>
    )
  }

  return (
    <div className="grid gap-1.5">
      <div
        role="group"
        aria-label={props.etiqueta}
        aria-busy={props.subiendo}
        onDragOver={z.alPasar}
        onDragLeave={z.alSalir}
        onDrop={z.alSoltar}
        className={cn(
          'flex min-h-44 min-w-0 flex-col justify-center rounded-lg border border-dashed border-(--color-line-strong) bg-(--color-surface) transition-colors',
          z.encima && 'border-(--color-primario) bg-(--color-primario-soft)',
          props.error && 'border-(--color-peligro)',
        )}
        data-zona-de-archivo=""
      >
        <input
          ref={entrada}
          type="file"
          accept={props.tipos}
          // Para quien usa teclado o lector de pantalla el control es el botón: un `<input type="file">` se anuncia como otro botón con el mismo nombre.
          aria-hidden
          tabIndex={-1}
          disabled={bloqueada}
          className="sr-only"
          onChange={z.alCambiar}
        />
        <Contenido
          {...props}
          alPedir={() => {
            entrada.current?.click()
          }}
        />
      </div>
      <RenglonDelError error={props.error} alReintentar={props.alReintentar} />
    </div>
  )
}
