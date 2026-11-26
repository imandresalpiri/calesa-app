// Pantalla del área `proyectos` de `repuestos`: la cabecera de `/repuestos/[id]` y el cliente del proyecto, que la hoja de una cotización (`/repuestos/[id]/cotizaciones/[cotizacion]`) recibe ya dibujado. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo
// que esa pantalla dibuja y nada más. Va aparte de `pantallas/proyectos.ts` (`/repuestos`) para que el detalle no cargue el JS del listado.
export { CabeceraDeProyecto } from '../features/proyectos/components/cabecera-de-proyecto'
export { VehiculoQueNoSeVe } from '../features/proyectos/components/vehiculo-de-la-cabecera'
export { ClienteDelProyecto } from '../features/proyectos/components/cliente-del-proyecto'
