// Pantalla del área `cadena` de `logistica`: `/logistica` (la gráfica de la cadena y «dónde está»). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja
// y nada más. La lista de una fase va en `pantallas/cadena-fase.ts` y sus esqueletos, en `pantallas/cadena-esqueletos.ts`.
export { BuscadorDeDondeEsta } from '../features/cadena/components/buscador-de-donde-esta'
export { EstadoDeLaGrafica } from '../features/cadena/components/estado-de-la-grafica'
export { FranjaDeDondeEsta } from '../features/cadena/components/franja-de-donde-esta'
export { GraficaDeLaCadena } from '../features/cadena/components/grafica-de-la-cadena'
