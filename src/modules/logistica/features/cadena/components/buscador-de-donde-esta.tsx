import Form from 'next/form'
import type { Route } from 'next'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_DONDE_BUSCAR,
} from '../../../entities/cadena/filtros'
import { CLAVE_DE_ORIGEN_DE_LOGISTICA } from '../../../entities/nucleo/enlaces'

type Props = {
  origenId: string
  // Lo que ya se buscó (queda escrito).
  q?: string
  // Busca en todos los orígenes (`?en=todos`): volver a buscar sigue ahí.
  enTodos: boolean
}

// «Dónde está»: un campo para escribir un nombre, un VIN o un lote y ver en qué fase está, en el origen elegido (o, con `enTodos`, en todos tus orígenes). Un formulario
// de verdad (Enter envía): pone `?q=` en la URL y la Cadena vuelve a leer sólo esa franja. Con menos de 3 letras o números la base ni se llama (`MINIMO_DE_BUSQUEDA_DE_LA_CADENA`).
export function BuscadorDeDondeEsta({ origenId, q, enTodos }: Props) {
  return (
    <Form
      action={RUTAS.logistica as Route}
      role="search"
      aria-label="Dónde está"
      className="flex gap-2"
    >
      <input type="hidden" name={CLAVE_DE_ORIGEN_DE_LOGISTICA} value={origenId} />
      {enTodos ? <input type="hidden" name={CLAVE_DE_DONDE_BUSCAR} value="todos" /> : null}
      <Input
        type="search"
        name={CLAVE_DE_BUSQUEDA_DE_LA_CADENA}
        defaultValue={q ?? ''}
        maxLength={100}
        aria-label="Buscar por nombre, VIN o lote"
        placeholder="Dónde está: nombre, VIN o lote"
        className="h-11 min-w-0 flex-1 md:h-9"
      />
      <Button type="submit" variant="outline" className="h-11 md:h-9">
        Buscar
      </Button>
    </Form>
  )
}
