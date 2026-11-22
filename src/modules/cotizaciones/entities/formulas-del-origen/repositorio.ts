// Lo que escribe la barra de la fórmula, por las RPC de las fórmulas del origen (la implementación está en `infra/formulas-del-origen/`). Cada una vuelve a pedir
// el permiso, compara la versión y valida: la pantalla sólo evita pedir lo que se va a rechazar.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { EsperadasDeActivar } from './activar'
import type { Pieza } from './copiar'
import type { FormulaActivada, FormulaCambiada, FormulaCreada, FormulaEliminada } from './resultado'

export type PedidoDeCrear = {
  // El id del intento: uno por apertura del modal (repetirlo devuelve lo ya creado).
  id: string
  origenId: string
  nombre: string
  // La fórmula de la que se copia (de este u otro origen), o nula para empezar en blanco.
  copiaDe: string | null
  pieza: Pieza
}

export type PedidoConVersion = { id: string; esperada: string }

export interface RepositorioDeFormulasDelOrigen {
  crear(pedido: PedidoDeCrear): Promise<ResultadoDeAccion<FormulaCreada>>
  renombrar(
    pedido: PedidoConVersion & { nombre: string },
  ): Promise<ResultadoDeAccion<FormulaCambiada>>
  archivar(pedido: PedidoConVersion): Promise<ResultadoDeAccion<FormulaCambiada>>
  eliminar(pedido: PedidoConVersion): Promise<ResultadoDeAccion<FormulaEliminada>>
  activar(
    pedido: EsperadasDeActivar & { nota: string },
  ): Promise<ResultadoDeAccion<FormulaActivada>>
}
