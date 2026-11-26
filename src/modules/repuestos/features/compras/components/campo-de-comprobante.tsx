'use client'

import { GrupoDeCampos } from '@/shared/ui/grupo-de-campos'
import { ZonaDeArchivo } from '@/shared/ui/zona-de-archivo'
import { AYUDA_DE_COMPROBANTE, TIPOS_DE_COMPROBANTE } from '../../../entities/compras/comprobante'
import { useComprobante } from '../hooks/use-comprobante'

type Props = {
  proyectoId: string
  // La ruta ya subida (vacía = sin comprobante).
  ruta: string
  alCambiar: (ruta: string) => void
  error?: string
  deshabilitado: boolean
  // Sólo se mira (sin elegir, reemplazar ni quitar).
  soloLectura?: boolean
}

// El comprobante de una compra, en una zona a la vista aunque esté vacía: se sube al elegir o soltar el archivo (el nombre es su hash, subir lo mismo dos veces no cambia nada) y la ruta se manda al
// guardar. Un archivo que se sube y no se guarda lo limpia `storage-gc`. Ver lo subido pide una URL firmada de 60 s al tocarlo; la vista previa de una imagen la pide una vez, al dibujarse.
export function CampoDeComprobante({
  proyectoId,
  ruta,
  alCambiar,
  error,
  deshabilitado,
  soloLectura = false,
}: Props) {
  const c = useComprobante(proyectoId, ruta, alCambiar)
  return (
    <GrupoDeCampos titulo="Comprobante de la compra">
      <ZonaDeArchivo
        etiqueta="Comprobante de la compra"
        vacio="Arrastra aquí el comprobante o elígelo."
        ayuda={AYUDA_DE_COMPROBANTE}
        tipos={TIPOS_DE_COMPROBANTE}
        archivo={c.archivo}
        pedirUrl={c.pedirUrl}
        subiendo={c.subiendo}
        error={error ?? c.rechazo}
        alReintentar={c.puedeReintentar ? () => void c.reintentar() : undefined}
        deshabilitada={deshabilitado}
        soloLectura={soloLectura}
        alElegir={(archivo) => void c.elegir(archivo)}
        alQuitar={c.quitar}
        alVer={() => void c.ver()}
      />
    </GrupoDeCampos>
  )
}
