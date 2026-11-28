import {
  CameraIcon,
  CircleIcon,
  FolderIcon,
  IdCardIcon,
  ImageIcon,
  PenToolIcon,
  SlashIcon,
  SquareIcon,
  StampIcon,
  TriangleIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'
import type { CapaDeArte, TipoDeCapa } from '../../../../entities/documento'

const POR_TIPO: Readonly<Record<Exclude<TipoDeCapa, 'forma'>, LucideIcon>> = {
  texto: TypeIcon,
  linea: SlashIcon,
  trazo: PenToolIcon,
  imagen: ImageIcon,
  logo: StampIcon,
  foto: CameraIcon,
  tarjeta: IdCardIcon,
}

const POR_FORMA: Readonly<Record<'rectangulo' | 'elipse' | 'poligono', LucideIcon>> = {
  rectangulo: SquareIcon,
  elipse: CircleIcon,
  poligono: TriangleIcon,
}

const CLASE = 'size-3.5 shrink-0 text-(--color-ink-soft)'

// El icono de una fila de «Capas»: lo que es la capa (la forma, por la suya) o la carpeta del grupo (sin capa).
export function IconoDeLaCapa({ capa }: { capa: CapaDeArte | null }) {
  if (capa === null) {
    return <FolderIcon aria-hidden className={CLASE} />
  }
  const Icono = capa.tipo === 'forma' ? POR_FORMA[capa.forma] : POR_TIPO[capa.tipo]
  return <Icono aria-hidden className={CLASE} />
}
