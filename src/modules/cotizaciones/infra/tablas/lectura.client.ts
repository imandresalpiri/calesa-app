// Leer una tabla de referencia para editarla desde el navegador (la ayuda de una celda, glosario: «Bloque de la ayuda»): la misma lectura del drawer de tablas
// (`leerTablaParaEditar`, entera o nada, por cursor), con la sesión de quien configura. Se pide al primer ✎ o «+ Añadir fila», nunca con la hoja.
import { createClient } from '@/shared/lib/supabase/browser'
import { leerTablaParaEditar } from './lectura'

export const leerTablaParaEditarEnElNavegador = (tablaId: string) =>
  leerTablaParaEditar(createClient(), tablaId)
