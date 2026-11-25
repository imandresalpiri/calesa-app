// La composición del área `tablas` en el navegador: la lectura de una tabla para editarla desde la ayuda de una celda. La importa sólo su hook; ningún barril la
// reexporta (lo que suma un `client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`).
export { leerTablaParaEditarEnElNavegador } from '../../infra/tablas/lectura.client'
