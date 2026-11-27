# origenes

Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos, sus datos clave y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. Uno de subasta nace con **un campo por cada dato normalizado que devuelve apibara** (el catálogo), todos encendidos. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`.

## Entra y sale

- Entra: `/configuracion/origenes` (la lista: sólo los orígenes que quien mira abre, tope 100 con aviso) —cada tarjeta es un enlace «Abrir <origen>» con su «⋯» como hermano: «Abrir» primero y, con `origenes.gestionar`, activar, desactivar y «Eliminar origen» (`accionesDeLaTarjeta()`; la confirmación va en `?panel=eliminar-origen&origen=<id>`, una por lista: `useEliminarOrigenDeLaLista()`)— y **la página del origen**,
  `/configuracion/origenes/[id]/fases|planilla|hoja|tarjeta|campos|categorias` (`src/app` arma el layout de `[id]` con las migas y el selector de origen, la
  cabecera y las pestañas con su ⚠; Fases, Planilla, Hoja y Tarjeta dibujan pantallas de `flujos` y `cotizaciones`, que este módulo no conoce). `/[id]` sin
  pestaña va a la última que la persona abrió (`equipo`: «Última pestaña del origen»; `[id]/route.ts`, `[id]/pestana-de-entrada.ts`). Las pantallas van partidas por pestaña: `pantallas/origen.ts` (la
  cabecera: `BotonDeDatos` y `DrawerDeDatos`, los datos del origen en un drawer `?panel=datos` (`PANEL_DATOS_DEL_ORIGEN`), y `MenuDelOrigen`, el «⋯» con
  «Datos» en el celular, activar, desactivar y eliminar; sus líneas, `lineasDelOrigen(origen, { conDatos, gestiona })` de `entities/acciones-del-origen.ts`),
  `origen-campos.ts` y `origen-categorias.ts`; `origen-datos.ts` es el formulario de página del paso Datos de la puesta en marcha (comparte
  `FichaDelOrigen` con el drawer). Las pestañas viven bajo el grupo `[id]/(pestanas)/` (su layout dibuja el marco).
- **La puesta en marcha** (glosario): `/configuracion/origenes/nuevo` (el alta, `origenes.gestionar`; `pantallas/origen-nuevo.ts`,
  `FormularioDelOrigenNuevo`) y `/configuracion/origenes/[id]/puesta-en-marcha/<paso>` (`datos`,
  `campos`, `flujo`, `formula`, `tarjeta`, `publicar`, `listo`; la raíz, un `route.ts` que lleva al paso que falta). `src/app` arma cada paso con el
  editor de su pestaña (`puesta-en-marcha/abrir.ts`: la sesión, el origen, los permisos y la fórmula de trabajo, una vez por pedido) y lo dibuja con
  `pantallas/puesta-en-marcha.ts` (`PasoAPaso`, `MenuDeLaPuestaEnMarcha`). Las reglas, puras y con test, en `entities/puesta-en-marcha.ts`:
  `estadoDeLaPuestaEnMarcha({ uso, hayFormulaDeTrabajo, permisos })` (lo hecho se deriva de lo que hay; nada guarda un «paso actual»), `estadoDelPaso()`,
  `pasoPendiente()`, `pasoSiguiente()`, `pasoAnterior()`, `enMarcha()` (sin fórmula activa) y `siguePendienteLaPuestaEnMarcha()` (en marcha y con un paso
  pendiente). La cabecera de la página del origen recibe `seguir` («Seguir la puesta en marcha») de `[id]/seguir-la-puesta-en-marcha.ts`, que lee la
  fórmula de trabajo sólo si el origen está activo, sin fórmula activa y con el permiso del cotizador.
- `index.ts`: lo de la puesta en marcha (arriba), `getOrigenes(incluirInactivos?)`, `leerLayout(origenId, { conUso })` (también los campos desactivados: quien consume filtra `activo`),
  `leerGruposDelOrigen(origenId)` (el catálogo de grupos de campos del origen, tope 100; la pestaña Campos y su paso de la puesta en marcha),
  `leerCampoPrincipal(origenId)` (o `null`; para quien nombra un vehículo fuera del listado), `leerDatosNuevosDeApibara`, `leerOrigenes`,
  `pasosParaCotizarYMover(origen, { apibaraActiva })` y `pasosQueFaltan()` (los cinco pasos de «Para cotizar y mover», glosario: Datos, Campos, Flujo,
  Fórmula y Tarjeta, con `estado` listo|aviso|bloquea; un inactivo, `{ inactivo: true }`; los dos últimos miran la fórmula **activa**: Fórmula, que haya una
  (`origenes_resumen().formula_publicada`), y Tarjeta, que la activa tenga la suya publicada (`tarjeta_publicada`); Fórmula lleva a la Planilla; en la página del origen, cada falta es el ⚠ de su pestaña, `faltaDeCadaPestana()` de `src/app`),
  `DATOS_COMUNES` y `leerDatosClave(origenId)` (para la ficha del vehículo: la lista resuelta, `{ de: 'comun', clave,
etiqueta }` o `{ de: 'campo', clave, etiqueta, campoId }`, con los de fábrica si está vacía; las claves comunes son nombres de columna de
  `vehiculos` en snake_case: `anio`, `categoria_id`, `url_origen`).
- `client.ts`: concordancia (`pluralDe()`, `articulo()`, `concordar()`, `frasePorVacio()`…), tipos y `useLayoutActivo(origenId)` (lo lee el panel del
  vehículo de la hoja de cotizar al abrirse, para que la hoja no lo cargue en cada apertura).
- Depende de `equipo` (`origenes.gestionar`). **No** depende de `empresa`, `flujos` ni `vehiculos`: lo trae la página por props o lo cuenta
  `origenes_resumen()`. `equipo` nunca importa este módulo.

## Archivos clave

- Espejos del SQL con test: `entities/datos-clave.ts` (`errorDeDatosClave()` ↔ `_origen_datos_clave_error()`, `DATOS_CLAVE_DE_FABRICA` ↔
  `_origen_datos_clave_de_fabrica()`, con el juego común `casos-de-datos-clave.json` que corren Vitest y `db:probar`), `entities/origen.ts` (`motivoParaNoEliminar()` ↔ `origen_eliminar()`), `entities/preconfiguraciones.ts`
  (`origen_preconfigurar_campos()`, `origen_crear_flujo()`), `entities/catalogo-apibara.ts` (`_apibara_catalogo()`; también contra
  `e2e/fixtures/apibara/`), `CLAVES_RESERVADAS` de `entities/campo.ts` (`_origen_clave_reservada()`).
- **El motor de campos es de `shared`** (`lib/campos`, `ui/campos`); acá, `CampoDeLayout` = `CampoBase` + lo propio del origen. La pestaña Campos
  es `features/campos/components/editor-de-campos.tsx`: arma para el editor de `shared` las casillas de dato clave (`hooks/use-datos-clave.ts`:
  poner, quitar y mover de a un cambio, con lo puro en `entities/datos-clave-edicion.ts`) y los «Comunes» (`DATOS_COMUNES` del tipo).
- `entities/pasos.ts`: `pasosParaCotizarYMover()` y `faltasDeLaTarjeta()` (la lista, en corto), con su test. `src/app/(app)/configuracion/origenes/pasos.ts`:
  a dónde lleva cada paso y su motivo sin permiso en ese origen (test contra las pantallas existentes); `acceso.ts` y `pestanas.ts`: las pestañas, su
  permiso en el origen y su motivo.

## Tablas

`origenes`, `origenes_campos`, `origenes_campos_grupos` (glosario «Grupo de campos»), `categorias`: sólo lectura para la app, se escriben por RPC. El motor `_campo_*`, `_campos_*`, `_atributos_*` lo
comparten los leads.
`origenes.datos_clave` (hasta 4, `check` de forma con `_origen_datos_clave_forma()`).
RPC: `origen_crear|guardar|eliminar`, `origen_datos_clave_guardar`, `origen_apibara_rutas_sin_campo`, `origen_apibara_agregar`, `origen_campo_crear|guardar|mover|eliminar|impacto`,
`origen_campo_grupo_crear|guardar|mover|eliminar`,
`categoria_crear|guardar|mover|eliminar`, `origenes_resumen`, `categorias_con_uso`. Triggers: `origen_crear_flujo`, `origen_preconfigurar_campos`,
`origen_tipo_inmutable`, `origen_datos_clave_de_fabrica`, `origen_campo_validar`, `origen_activo_requerido` (en `vehiculos` y `cotizaciones`).

## No se rompe

- Crear un origen es un solo INSERT. La clave sale del nombre en el servidor y no cambia.
- El **tipo** no cambia: decide campos preconfigurados, regla `aduana` y mapeo con apibara. Equivocado y sin uso: se elimina y se crea de nuevo.
- Con vehículos, cotizaciones o fórmula publicada **no se elimina**: se desactiva (reversible); no recibe vehículos ni cotizaciones nuevos, sus fichas
  se siguen viendo y la matriz de roles lo lista «inactivo».
- Un campo con datos no cambia de tipo ni se elimina: **quitar es desactivar** (el dato queda en `vehiculos.atributos`). Uno `es_sistema` tampoco
  cambia de clave. Volver requerido no toca vehículos: el trigger valida al escribir.
- Toda edición manda su `actualizado_en` (nulo se rechaza). El orden es relativo («después de X»); renumera 10, 20, 30… tocando sólo lo que cambia.
- **`clave_apibara` es una ruta** con puntos (`pricing.estimated_cost.median`), única por origen; sólo en subasta. Los 17 `es_sistema` se llenan con
  su ruta; el resto son extra, sin tarjeta, sin filtro y **no públicos**. `cilindros`, `enciende_y_anda`, `nota_subasta`, `banderas_subasta` son
  manuales.
- **Un dato nuevo de la API no crea un campo solo:** la pestaña Campos avisa y «Agregarlos» los crea; los vehículos se llenan en su próximo refresco.
- Un campo de origen no es `correo` ni `documento`. Marca, modelo, año, VIN, lote y precio son columnas de `vehiculos`, no campos; lo demás vive en
  `atributos` (`vehiculo_validar_atributos`).
- `valor_defecto` sólo precarga el alta de un vehículo; la base nunca lo aplica. Cambiar el tipo o quitar la opción lo limpia.
- **Campo principal**: uno por origen como mucho (`origenes_campos_principal_unico`), activo y nunca `moneda`. Marcar otro desmarca el anterior en la
  misma llamada (y mueve su versión); desactivarlo lo desmarca; sin principal, el vehículo se nombra por su título. `origen_campo_guardar` toma el
  origen `for no key update` antes que el campo y un `23505` del índice sale `PT409`.
- **Datos clave**: hasta 4, en orden, sin repetidos; comunes del tipo (lote, plataforma y enlace sólo en subasta) o campos activos del origen.
  Un origen nace con los de fábrica de su tipo (trigger `before insert`); vacíos = los de fábrica al leer. Se guardan enteros con la versión
  del origen (un campo que ya no está activo sale `PT409`). **Desactivar o eliminar un campo lo quita de la lista en la misma llamada** (sólo
  escribe si estaba: no mueve la versión en vano) y `origen_campo_eliminar` también toma el origen antes que el campo. `DATOS_COMUNES` está
  espejado de `camposComunes()` de `vehiculos`, con su test en `src/app/(app)/configuracion/origenes/datos-comunes.test.ts`.
- El aviso de impacto va **dentro** del panel del campo; `origen_campo_impacto` cuenta también la papelera.
- **Grupo de campos**: del catálogo del origen (FK compuesta `origenes_campos_grupo_fkey` con `origen_id`), un nombre por origen sin importar
  mayúsculas, tildes ni espacios. Lo que nace con texto (presets, apibara) pasa por `_origen_campo_grupo_asegurar()`. Elegir uno desactivado sólo
  vale para conservar el que el campo ya tiene. Borrar el origen arrastra sus grupos. El combo del panel de un campo crea con
  `crearGrupoDelOrigen` (sin revalidar: el campo está a medio llenar); el drawer «Grupos» (`?panel=grupos&quitar=<id>`) con
  `agregarGrupoDelOrigen`, `guardarGrupoDelOrigen`, `moverGrupoDelOrigen` y `quitarGrupoDelOrigen` (`origenes.gestionar`, revalidan
  `/configuracion/origenes`; `hooks/use-grupos-del-origen.ts`). Sin el permiso, el drawer se abre de sólo lectura.
- Categoría: un nivel de anidado, un nombre por lugar (sin mayúsculas); con subcategorías activas no se desactiva; con subcategorías o vehículos no se
  elimina.
- Entra quien tiene `origenes.gestionar`; de sólo lectura, `flujos.configurar`, `cotizaciones.configurar` o `logistica.catalogos.gestionar`, cada uno
  **en ese origen** (la base pide el permiso en algún origen, también en `origenes_resumen()`: el filtro por origen es de `src/app`). La pestaña Fases la abre
  `flujos.configurar` o `logistica.catalogos.gestionar` (con sólo los catálogos, el diagrama en lectura y los catálogos arriba). No hay `origenes.ver`.
- Plataformas: las que están en `integraciones.config.plataformas` (techo) y en `origenes.apibara_plataformas`; sin elegida, las de la integración.

## Ojo

- `pluralDe()` es una regla (vocal → s, consonante → es, z → ces, -ón → -ones); si falla, la salida es una columna `sustantivo_plural`.
- `<fieldset disabled>` no apaga el `Switch` de Base UI.
- Promover un atributo a columna es migración + fila en `origenes_campos`; no desde la UI.
- **No es el origen del lead** (`origenes_lead`, en `leads`).
