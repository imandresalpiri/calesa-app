// El esqueleto de la página de un embarque, sólo para su `loading.tsx`: importar `transporte.ts` desde `loading.tsx` bajaría su chunk dos veces. Sólo `src/app` importa este archivo.
export { EsqueletoDelEmbarque } from '../features/transporte/components/esqueleto-del-embarque'
