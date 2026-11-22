import { Badge } from '@/shared/ui/badge'

// Un nivel de acceso retirado sigue en la matriz (lo que se le dio sigue valiendo): su nombre se apaga y lleva esta insignia.
export function InsigniaDeRetirado() {
  return <Badge variant="outline">Retirado</Badge>
}
