import { cn } from 'cn'
import { Badge } from '@/shared/ui/badge'
import { TEXTO_DEL_ESTADO, type EstadoDelContenedor } from '../../../entities/transporte/estado'

// El color de cada estado, de los tokens: en tránsito es información, llegó y entregado son positivos, armándose y sin embarque quedan neutros. El texto siempre dice el estado
// (el color nunca es lo único).
const TONO: Record<EstadoDelContenedor, string> = {
  armandose: 'border-(--color-line-strong) bg-(--color-paper-soft) text-(--color-ink-soft)',
  en_transito: 'border-transparent bg-(--color-info-soft) text-(--color-info-ink)',
  llego: 'border-transparent bg-(--color-positivo-soft) text-(--color-positivo-ink)',
  entregado: 'border-transparent bg-(--color-positivo-soft) text-(--color-positivo-ink)',
  sin_embarque: 'border-(--color-line-strong) bg-(--color-paper-soft) text-(--color-ink-soft)',
}

/** El estado de un embarque o un contenedor, como lo calculó la base. */
export function InsigniaDeEstado({
  estado,
  className,
}: {
  estado: EstadoDelContenedor
  className?: string
}) {
  return (
    <Badge variant="outline" data-estado={estado} className={cn(TONO[estado], className)}>
      {TEXTO_DEL_ESTADO[estado]}
    </Badge>
  )
}
