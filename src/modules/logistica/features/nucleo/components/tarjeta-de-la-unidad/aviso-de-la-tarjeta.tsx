import { Badge } from '@/shared/ui/badge'

// El aviso de una tarjeta de la unidad («2 por aprobar», «Falta el BL»): texto con el color de aviso, nunca sólo color. `data-aviso` lo encuentran el borde de la tarjeta y
// el e2e. Compatible con servidor.
export function AvisoDeLaTarjeta({ texto }: { texto: string }) {
  return (
    <Badge
      data-aviso=""
      className="max-w-full truncate bg-(--color-aviso-soft) text-(--color-aviso-ink)"
    >
      {texto}
    </Badge>
  )
}
