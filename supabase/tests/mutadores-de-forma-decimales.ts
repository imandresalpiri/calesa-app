// Los mutadores de forma de los «Decimales» de una celda (F74–F77 de `_formula_forma_nodo()`): en cualquier nodo, como la `n` de
// `redondear`. Van al final del corpus para que los casos de antes salgan iguales.
import type { Mutador } from './mutadores-de-formula'
import { enNodo } from './mutadores-de-forma'

export const MUTADORES_DE_FORMA_DE_DECIMALES: readonly Mutador[] = [
  enNodo(
    'decimales_texto',
    () => true,
    (n) => (n['decimales'] = '2'),
  ), // F74
  enNodo(
    'decimales_nulo',
    () => true,
    (n) => (n['decimales'] = null),
  ), // F74
  enNodo(
    'decimales_subnormal',
    () => true,
    (n) => (n['decimales'] = 1e-310),
  ), // F75
  enNodo(
    'decimales_5',
    () => true,
    (n) => (n['decimales'] = 5),
  ), // F76
  enNodo(
    'decimales_1e9',
    () => true,
    (n) => (n['decimales'] = 1e9),
  ), // F76
  enNodo(
    'decimales_2_5',
    () => true,
    (n) => (n['decimales'] = 2.5),
  ), // F77
  enNodo(
    'decimales_menos_1',
    () => true,
    (n) => (n['decimales'] = -1),
  ), // F77
]
