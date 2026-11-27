# El cotizador: fórmula como grafo

La fórmula de un origen vive en `formulas.definicion` y `formulas.params` (jsonb) y se versiona entera. El candado que impide publicar
una fórmula rota es doble y aplica las mismas reglas: `validar.ts` (`src/modules/cotizaciones/entities/`) y `validar_formula()` en la
base, con un juego común (`entities/casos-de-formula.json`) y un corpus diferencial (`supabase/tests/corpus-de-formula.json`). La
evalúan el motor TS (`entities/motor.ts`) y `evaluar_formula()`. Referencia: `docs/referencias/excel-de-cotizacion.md`.

## Forma

`definicion` = `{ nodos, buckets, total_en, grupos }`: `nodos` es una lista ORDENADA (el orden es el de evaluación; sólo se referencia
hacia atrás); `buckets` mapea un nombre libre a un id de nodo `tipo_cambio` (`{ exterior: 'tc_paralelo', aduana: 'tc_oficial' }`);
`total_en` es el tipo de cambio que divide el total en Bs (obligatorio con grupos); `grupos` es `[{ id, etiqueta, plazo, tono,
bucket }]`. `params` = `{ <constante>: número, …, tablas?: { <clave de tabla>: [ { <columna>: número | texto | null } ] } }`.

### Los nodos

Común: `id` (`^[a-z][a-z0-9_]{0,40}$`), `tipo`, `etiqueta`; `formato?` (`usd` por defecto, `pct`, `raw`, `moneda`); `decimales?` (entero de 0 a 4, los
«Decimales» de la celda: abajo); `descripcion?`;
`salida?` (`total`, `base_imponible`, `aparte`); `bucket?` (sólo sin grupos); `grupo?`; `solo_en?` (claves de la variante; no en
`tipo_cambio` ni `opcion`). Cada objeto es **estricto**: una clave mal escrita es un error.

- `input`: `sugerido_de?` (nodo anterior), `requerido_si?` (bandera), `condicion?`. Lo tipea el asesor.
- `constante`: `condicion?`, `texto?`. Vale `params[id]`, el «valor por defecto global» que cambia el ⚙ (publica la N+1).
- `tipo_cambio`: `clave` (una clave, un solo nodo). Vale el de `tipos_cambio` al cotizar; se congela.
- `campo_vehiculo`: `campo` (`anio` o la clave de un campo del origen), del vehículo vinculado. `bandera`: el interruptor, 0 o 1.
- `opcion`: `opciones: [{clave, etiqueta, titulo}]` (dos o más), `por_defecto?`, `en_par?` («Se cotiza en par»: exactamente dos opciones; sin la clave, la
  de siempre). A lo sumo una. Vale la clave elegida (texto); la nombran `solo_en` y un `match`, nunca un cálculo.
- `tabla`: `tabla`, `match` {columna: nodo anterior o, si no hay uno con ese id, campo del vehículo}, `columna`, `sobrescribible?`,
  `condicion?`. `tramo`: `tabla`, `sobre` (un nodo), `columna`, `sobrescribible?`, `condicion?`: la fila con `desde ≤ sobre ≤ hasta`.
- `calculo`: `op`, `sobrescribible?`, `condicion?`, `texto?`. Operaciones: `suma(de ≥ 1)`, `porcentaje_de(de ≥ 1, pct)` = Σde × pct,
  `multiplicar(de ≥ 2)`, `restar(de[0] − de[1…])`, `dividir(de[0] / de[1])`, `si(condicion, de[0])`,
  `depreciar(de[0], tabla, sobre, columna)`, `redondear(de[0], n de 0 a 6)`. **Condiciones y extremos** (glosario: «Condición (de la
  fórmula)»): `comparar(de: [a, b], cmp)` con `cmp` `>` `<` `>=` `<=` `=` `<>` = 1 o 0; `es_opcion(de: [la variante], cmp '='|'<>', clave)` =
  1 o 0 según la clave elegida; `y(de ≥ 2)` y `o(de ≥ 2)` = 1 o 0 (distinto de 0 es verdadero); `elegir(prueba, de: [si_verdadero,
si_falso?])` = `de[0]` si la prueba es distinta de 0, si no `de[1]` o 0; `max(de ≥ 1)` y `min(de ≥ 1)`. El `si` de una bandera sigue
  siendo `si`; una condición cualquiera o una rama «si no» es `elegir`.

Un nodo nuevo lleva su tipo en el Zod de `nodos.ts`, su caso en `referenciasDe()` (`nodos-referencias.ts`) y en sus espejos de la base (`validar_formula()`,
`_diseno_auxiliares()` y `_nodos_en_par()`), y el juego de prueba.

**Los decimales de una celda** (glosario: «Decimales (de una celda)», `entities/decimales-de-celda.ts`): `decimales` dice con cuántos decimales se
muestra el valor del nodo en todos lados (la hoja, sus subtotales, la tarjeta del total y su Bs, «Total guardado» y «Cotización n.º N guardada», lo pisado, la tarjeta de la cotización con su PDF, su
imagen y su texto con datos, comparar, las revisiones y la columna Ejemplo de la planilla). **Sin la clave, «Automático»**: cada superficie muestra lo de
siempre (2 en un monto, hasta 2 en un número o un porcentaje de la hoja, 1 en un porcentaje de la tarjeta), y una versión sin el dato se ve como antes.
Sólo cambia la vista: el motor no la lee, lo guardado sigue a precisión completa y lo que se edita también (`formatearParaEditar()`). En un porcentaje son
decimales de puntos («14,9 %» con 1). No la lleva un nodo que se ve como texto (`aceptaDecimales()`: una bandera, la variante o una condición; ni, lo
dice la planilla, un dato del vehículo que no es un número). La base la valida en `_formula_forma_nodo()` con el mismo rango y mensaje que el Zod, justo
tras `formato` (los dos dan el primer error en el mismo campo), y la manda en la hoja (`_hoja_decimales()`: en cada celda, su secundario, el subtotal y la
tarjeta del total, sólo si el nodo la tiene) y en `cotizacion_tarjeta()` (`decimales`, y `decimales_del_pct` del % que nombra el nodo). Los totales que
no son una celda (el listado, «De este vehículo», la cabecera de comparar, la línea del total de una revisión y el resumen de una guardada) siguen con 2,
y el tipo de cambio de la tarjeta (`tc_valor`), con 4.

### Grupos, buckets y el total

- **Un grupo** tiene plazo, tono (clave del catálogo `tonos`) y bucket; no es un nodo (un nodo entra con `grupo: id`). Su USD es la
  suma de sus miembros; su Bs, ese subtotal por el tipo de cambio de su bucket.
- **Un bucket** es el papel del dinero (afuera o aduana); `buckets` le da a cada uno un nodo `tipo_cambio`.
- **El total:** con `total_en`, **manda Bs ÷ tc(`total_en`)** (Bs = Σ grupo × tc(su bucket)); el nodo `salida: total`, único, es la suma
  de los dólares y también se ve. Con grupos, `total_en` es obligatorio. Sin `grupos` el bucket va en el nodo y **reparte el total**:
  total con bucket, Bs = total × su tc (`oficina`); si no, un `suma` cuyos términos directos tienen bucket (`subasta_usa`).
- `base_imponible` y `aparte` (la garantía) se muestran y nunca suman; ninguno va en un grupo.

### Sugerido, sobrescribible y el par porcentaje-monto

Un `tabla`, `tramo` o `calculo` con `sobrescribible: true` calcula su valor (el sugerido) y la cotización puede traer otro. **El par
porcentaje-monto** es un `porcentaje_de` sobrescribible y su `pct`: **manda el monto si tiene override**, y si no, el %; si manda el
monto, `valores[pct]` guarda monto ÷ base y `fuentes[pct] = override`. Ningún otro nodo lee ese `pct`, y acepta un valor
(`aceptaValor()` en `nodos.ts`; si no, `par_mal_tipado`).

**Al cotizar, `sobrescribible` no limita qué se pisa:** manda la hoja («Pisar un cálculo», abajo). Sigue decidiendo el punto de
«sugerido», el par de esta regla, `atajos_no_sobrescribible`, `par_sin_secundario`, `pct_compartido` y el motor sin `pisables` (el editor
y la paridad).

### La variante y el interruptor

Un nodo fuera de su variante (`solo_en`) o con `condicion` apagada vale 0 sin leer sus referencias, no guarda override y se dibuja
deshabilitado con su motivo («El motor» › «La variante y el estado»). El `opcion` va antes que todo nodo con `solo_en`. El total no
lleva `solo_en`, `condicion` ni `sobrescribible`.

Una **variante en par** (`en_par`) no la elige la persona: la hoja cotiza las dos opciones a la vez y guardar crea dos **cotizaciones hermanas**
(«Cotizaciones hermanas (la variante en par)», abajo).

### Las tablas congeladas (D5)

Editar una tabla de referencia publica la N+1 de cada fórmula que la usa, y la fórmula congela en `params.tablas` las filas que usa:
recalcular con su versión vale también para las tablas. **El motor usa la congelada si existe, aunque esté vacía**; si no, la viva
(`tablas_referencia_filas`); sin ninguna, `tabla_sin_filas`.

**Publicar una tabla.** Una tabla tiene versión (`version`, `nota`, `publicado_por`, `publicado_en`) y se escribe sólo con
`tabla_referencia_publicar(p_tabla, p_filas, p_nota, p_version_esperada)`: `authenticated` no tiene `insert`, `update` ni `delete` en
`tablas_referencia(_filas)`. La pantalla manda la tabla **entera** (filas en orden) con nota y la versión que leyó; la base reemplaza las
filas (también las inactivas), sube la versión y publica la N+1 de cada fórmula publicada que la usa (un nodo con `tabla = clave` **o** la
copia en `params.tablas`) con la copia nueva en `params.tablas[clave]` y todo lo demás igual; el borrador no se toca (uno empezado antes da
PT409 al publicarse). Una compartida (origen nulo) va a los orígenes sin tabla propia activa de esa clave y pide `cotizaciones.configurar`
en **cada** origen que la usa.

- **Orden de rechazos:** 42501 con el mismo texto (tabla inexistente, inactiva o ajena), esperada nula, nota vacía; tras el `for update` de
  la tabla, el permiso de cada origen que la usa, PT409 («Ana publicó la versión 3 de esta tabla hace 2 min.»), las filas contra `columnas`
  (hasta 2.000; `numero` → número, `anio` → entero, `texto` → hasta 200; `hint` `filas.<i>.<clave>`, desde 0) y «La tabla no cambió.» (las
  mismas vivas y cada publicada ya con esa copia: tras revertir, publicar las mismas filas devuelve la tabla).
- **Candados:** la tabla, después `formulas:<origen>` en orden de origen; la publicada se relee dentro de cada uno (si ya no la usa, se
  salta; si empezó a usarla, se pide su permiso). Devuelve `{version, formulas: [{origen_id, version}]}`.
- **La base no congela al publicar una fórmula:** una versión anterior que leía la viva recalcula con las filas nuevas; una que congeló, con
  su copia; lo guardado de una cotización no cambia (manda su snapshot).

### Crear, columnas y desactivar

La estructura de una tabla (su existencia, sus columnas, si está activa) también se escribe sólo por RPC, con la misma clave de permiso
(`cotizaciones.configurar` del origen; en una compartida, también la de cada origen cuya fórmula la usa) y la misma versión que publicar.

- **`tabla_referencia_crear(p_id, p_origen, p_nombre, p_columnas)`** (origen nulo = compartida). La clave sale del nombre en la base
  (`_tabla_referencia_clave()`: minúsculas ASCII, las letras con acento por su base, lo demás a `_`, `t_` si empieza con un dígito, hasta 40) y
  no cambia; su espejo es `claveDeLaTabla()`. Toma `tablas_referencia:crear`: un `p_id` que ya existe con el mismo destino devuelve
  `repetido: true` (idempotente), con otro destino 42501. Rechaza una clave tomada en el mismo destino, activa o desactivada, y una propia
  con la clave de una compartida activa, que la taparía (23505, `hint` `nombre`); también un destino que ya recibe 100 tablas activas,
  propias y compartidas (una compartida, en cualquier origen: 22023 con su nombre). Nace en la versión 1, sin filas. Devuelve
  `{id, clave, version, repetido}`.
- **`tabla_referencia_columnas(p_tabla, p_columnas, p_version_esperada)`** manda la lista entera, en orden: de 1 a 20, clave
  `^[a-z][a-z0-9_]{0,40}$` única, etiqueta de hasta 60 sin repetir (sin distinguir mayúsculas ASCII) y tipo `numero`, `anio` o `texto` (uno de
  antes se conserva si la columna sigue con el suyo). Una columna que sigue no cambia de tipo (22023); renombrar es cambiar la etiqueta, la
  clave queda. Quitar una columna que nombra la publicada o el borrador de una fórmula del origen sin archivar (las archivadas no cuentan), en
  un origen que recibe la tabla, da 23503 con quién
  («La columna «País» la usa la fórmula publicada de Japón.»): la usa un nodo `tabla` por su `match` o su `columna`, y un `tramo` o un
  `depreciar` por su `columna`, `desde` y `hasta`. Quitarla borra sus valores de todas las filas. Sube la versión con una nota automática
  («Columnas: sumó «Recargo»; renombró «A» a «B»; quitó «C»; cambió el orden.») y no publica ninguna fórmula (no cambian filas). Devuelve
  `{version}`.
- **`tabla_referencia_desactivar(p_tabla, p_version_esperada)`**: sólo si ninguna fórmula publicada ni borrador la usa (23503 con quién, `hint`
  `tabla`). Sus filas quedan y su clave no se vuelve a usar en ese destino; no se reactiva desde la pantalla. Devuelve `{id}`.
- **Orden y candados** (los dos últimos, `_tabla_referencia_tomar()`, el mismo orden de publicar): 42501 igual para lo que no existe, está
  desactivada o es ajena; esperada nula; la tabla `for update`; `formulas:<origen>` de cada origen que la recibe, en orden; el permiso de
  quien la usa; PT409 con la versión. Un borrador que empieza a usar una columna mientras otro la quita: quien llega segundo ve al otro.
- Los errores llegan tal cual a la pantalla (22023 con el campo en `hint`: `nombre`, `origen`, `version`, `columnas`, `columnas.<i>.clave|
etiqueta|tipo`): nombran una fórmula y una columna, que la capa genérica cambiaría por un texto técnico.

## Las reglas

**Primero la forma (`forma`):** el Zod de `nodos.ts` y `formula.ts`. **Después, 32 reglas cruzadas** con código estable (contrato con la
base; lista y textos de cada lado en `entities/motivos-de-formula.ts`); `donde` es el id del nodo, grupo o clave donde se rompe (en la
base, `hint`): `nodo_duplicado`, `referencia_inexistente` (un `match` sin nodo es un campo del vehículo), `ciclo`,
`referencia_hacia_adelante` (también `solo_en` antes del `opcion`), `referencia_de_tipo` (la `prueba` de un `elegir` y los términos de
`y`/`o` son una bandera o un `comparar`, `es_opcion`, `y` u `o` —nunca un `elegir`—; el `de` de un `es_opcion`, la variante), `total_unico`, `total_fijo`,
`total_no_es_monto`, `constante_sin_valor`, `param_sin_constante`, `par_mal_tipado`, `pct_compartido`, `tipo_de_cambio_repetido`,
`tipo_de_cambio_inexistente`, `bucket_inexistente`, `total_sin_tipo_de_cambio`, `grupos_sin_total_en`, `grupo_duplicado`,
`grupo_inexistente`, `grupo_vacio`, `bucket_con_grupos`, `miembro_no_es_monto` (sólo `input`, `constante`, `tabla`, `tramo`, `calculo`,
en usd o moneda), `miembro_con_salida`, `doble_conteo` (un miembro que acumula otro: `elegir` acumula sus ramas y no su prueba, `max` y
`min` su `de`, una comparación, `y` u `o` nada), `opcion_repetida`, `opcion_clave_repetida`,
`opcion_por_defecto_inexistente`, `par_sin_dos_opciones` (`en_par` con otra cantidad de opciones que dos), `solo_en_sin_opcion`, `solo_en_opcion_inexistente`,
`clave_de_opcion_inexistente` (un `es_opcion` con una clave que la variante no tiene), `campo_con_punto` (un campo de vehículo con punto:
es una columna o la clave de un campo del origen).

El validador **devuelve el primer rechazo**, en orden fijo, y es **lineal** (todo bucle y toda búsqueda pasan por `medidor.ts`).

### En la base

`validar_formula(definicion, params)`, STABLE, hace lo mismo que `validarFormula()`. Rechaza con `22023`, el código en DETAIL y
`donde` en HINT; sólo código y `donde` son contrato. **Divergencia declarada:** la base es más estricta con `__proto__` en `buckets`,
`tablas` o una fila. La base nunca acepta lo que Zod rechaza.

## El motor

`evaluar(formula, entrada, modo?, medidor?)` en `entities/motor.ts`: puro (sin I/O, fecha, azar ni base). `formula` es la salida de
`validarFormula()`. `evaluar_formula()` es su espejo; comparten `entities/casos-del-motor.json`.

**La entrada** (`esquemaEntrada`, `motor-entrada.ts`): `inputs` (lo tipeado por id de `input`), `banderas` (lo que no está, apagada),
`tipos_cambio` (por clave, > 0), `vehiculo` (por campo: número, texto o null), `tablas` (las vivas; la congelada manda), `variante?`
(sin clave, el `por_defecto`), `overrides` (`{id: número}`; el que no se aplica no es error).

**El resultado:** `valores` (todos los nodos, en el orden de la lista; null si falta algo que lo alcanza; el `opcion`, su clave),
`estados` (`activo`, `fuera_de_variante`, `condicion_apagada`), `fuentes` (`default`, `sugerido`, `override`, `input`; sólo nodos
activos que aceptan un valor), `totales` (`grupos` `{usd, bs, se_dibuja}`, `bs`, `usd` = Bs ÷ tc(`total_en`) o, sin `total_en` ni modo,
la suma de los dólares, y `suma_usd` = el nodo `salida: total`), `faltantes` (`{codigo, donde, ref?}`, en el orden en que nacen) y
`overrides_descartados` (`{id, motivo}`).

**Los errores de llamada lanzan** `ErrorDelMotor`: `modo_invalido`, `entrada_invalida` (clave de `inputs`/`banderas` de otro tipo;
`variante` inexistente; sin `variante` ni `por_defecto`), `formula_sin_validar`. Lo que causa una persona no lanza: viaja como
`faltantes` o `overrides_descartados`.

### La variante y el estado

La pasada previa (`motor-estados.ts`) decide cada nodo: con `solo_en` y variante ausente, `fuera_de_variante`; con `condicion` y
bandera ≠ 1 (una bandera fuera de su variante está apagada), `condicion_apagada`; si no, `activo`. Un nodo inactivo vale 0 sin leer
referencias y su override se descarta. La variante gana a la condición. También marca los grupos que se dibujan y los pct «pisados».
Un `match` que nombra la variante compara la clave elegida (texto) con la columna. Un input tipeado fuera de su variante vale 0.

### Overrides y fuentes

**Precedencia: override > sugerido.** Un nodo activo con override vale el override y **no calcula su sugerido**. ↺ lo quita.
`constante`: `default` u `override`. `tipo_cambio`: `default` (el de la empresa) u `override` (≤ 0 es sin valor).
`tabla`/`tramo`/`calculo` sobrescribible: `sugerido` u `override`; uno que sólo se pisa por su celda (`pisables`): `override` o sin
fuente. `input` sin `sugerido_de`: `input` (su override se descarta como
`no_sobrescribible`; lo tipeado va en `inputs`); con `sugerido_de`: tipeado (`override`) o el del nodo que nombra (`sugerido`). Lo demás
no tiene fuente y su override se descarta `no_sobrescribible`.

Motivo de un descarte, por precedencia: `nodo_inexistente`, fuera de variante, apagado, `no_sobrescribible`. Los de nodos van en el
orden de la lista; los inexistentes, al final **ordenados por id** (bytes, `collate "C"`). Una cotización que pasa a la N+1 trae los
overrides de la N. `total_en` y los buckets leen el valor final del nodo.

### El par porcentaje-monto

Base = Σde de izquierda a derecha. **Con override del monto, el pct está «pisado»**: no se calcula, no aplica su propio override, su
fuente es `override` y vale monto ÷ base. Sin override: monto = base × pct (`sugerido`). Override sólo del pct: monto = base × pct. Los
dos: manda el monto. Base 0 y manda el %: monto 0; base 0 con override del monto: pct null y `division_por_cero` en el pct.

### Pisar un cálculo

**Qué se pisa lo dice la hoja, no la fórmula** (glosario: «Pisar un cálculo»). La entrada suma `pisables?` (ids): los cálculos que la
hoja dibuja en una celda (en la base, `_cotizacion_pisables()`; el editor, la paridad y el corpus no la mandan). Un `tabla`, `tramo` o
`calculo` que no es el total (`esPisable()`) y está en la lista acepta un override como uno `sobrescribible`; sin override no tiene
fuente (`sugerido` es de los sobrescribibles). Lo escrito sobre algo que no está en la lista se descarta `no_sobrescribible`.

**El par por la hoja:** un `porcentaje_de` no `sobrescribible`, en `pisables`, cuyo `pct` es una constante o un input que ningún otro
nodo nombra (`pctsExclusivos()` de `motor-pares.ts`; `_motor_pcts_exclusivos()`), es un par porcentaje-monto: con el monto escrito, el
pct vale monto ÷ base. Un pct compartido no se reescribe: el monto queda fijo y el pct, como estaba.

**`calculados`:** lo que daría cada cálculo pisado (en `pisables` y con override) sin lo escrito, calculado aparte en la misma pasada
sin tocar `valores`, `fuentes`, `faltantes` ni los totales (`calcularAparte()` de `motor-nodos.ts`). Con el pct del par pisado, también
el del pct (lo que valdría sin el pisado), y el monto se calcula con él. Sin pisados no viaja.

**En la hoja:** la celda de un cálculo se edita con el nivel de siempre (`_hoja_estado()`; sin él, el candado con su motivo `{nivel}`); la
del total sigue con `se_calcula`. Lo que no tiene celda (el total, los subtotales, un `campo_vehiculo`, las banderas, la variante) nunca
se pisa. La celda pisada dice «Editado a mano» (el lápiz), «Calculado: $480» (de `calculados`, en el formato del lado pisado) y ↺
«Volver al calculado»; la primera pisada de cada hoja abierta muestra un aviso en línea que no bloquea («Pisaste un cálculo: queda fijo
aunque cambien los datos. ↺ lo devuelve.»), también por un atajo, y no vuelve hasta que la hoja se monte otra vez. Bajo el total, la hoja lista lo
pisado que cuenta («Editado a mano: Transferencia a USA $500, calculado $480»), en el orden de la hoja. **La tarjeta, el PDF y la imagen
no lo marcan**: dibujan el valor y nada más. Las revisiones dicen «Pisó «X»: $480 → $500» y «Volvió al calculado «X»» (`cotizacion_revisiones()`).

### `sugerido_de` y `requerido_si`

«Tipeado» es que la clave está en `inputs`, aunque valga 0. `sugerido_de` sin tipear vale lo del nodo que nombra (`sugerido`);
tipeado, `override`. `requerido_si` encendida y sin tipear: null con `requerido_sin_valor` (donde = el input, ref = la bandera); un
sugerido no lo cumple; un input inactivo no exige nada.

### Qué pasa cuando falta algo

- Input o bandera sin valor: **0**, sin faltante. Dan null con su faltante: `requerido_sin_valor`; `campo_sin_valor` (campo del
  vehículo ausente, null o no número); `tabla_sin_filas`; `fila_sin_coincidencia`; `celda_sin_valor` (no es número); `division_por_cero`;
  `tipo_de_cambio_sin_valor` (ausente o ≤ 0); `fuera_de_rango` (no finito). Un nodo anota a lo sumo un faltante; uno que lee un null
  es null sin faltante nuevo. Fuera de variante o condición apagada: **0 sin leer referencias**.
- **Totales:** el USD de un grupo es null si lo es un miembro; su Bs, si lo es su USD o su tipo de cambio. **Un grupo que no se dibuja**
  vale `{usd: 0, bs: 0, se_dibuja: false}` y no lee su tipo de cambio. Los códigos (`motor-contexto.ts`) son el contrato con la base.

### La aritmética

Dobles (float8), de izquierda a derecha: `suma` = ((d0 + d1) + d2)…; `restar` = ((d0 − d1) − d2)…, nunca d0 − Σresto; `multiplicar`
igual; `porcentaje_de` = (Σde) × pct. **Condiciones y extremos:** un término null da null (`comparar`, `y`, `o`, `max`, `min`; en la base,
nunca `greatest` ni `least`, que saltan los NULL); la igualdad es exacta en float8; `max` y `min` recorren de izquierda a derecha con `>` y
`<`; `es_opcion` compara la clave elegida como texto (sin variante, null). `elegir` con la prueba null es null y si no vale su rama elegida
(un null de la otra no la alcanza); las dos ramas son nodos y se evalúan igual, así que el faltante de la rama no elegida sigue en
`faltantes`: un SI no vuelve opcional un input (para eso, `condicion` y `requerido_si`). −0 se guarda como 0; lo no finito, null con `fuera_de_rango`. **`redondear(x, n)` =
`round(x::float8::numeric, n)::float8`:** 15 cifras significativas y mitad lejos de cero, como el ROUND del Excel (2,675 da 2,68);
`src/shared/lib/redondeo.ts` lo hace exacto con BigInt. **Al mostrar** con los «Decimales» de una celda, `src/shared/lib/cifra-fija.ts` redondea igual
(`redondeadaParaMostrar()`: `redondear(x, n)`, y en un porcentaje `redondear(x, n + 2)` sobre la fracción) y recién después formatea con N fijos
(`formatearConDecimales()`), porque `Intl` sobre el doble da otra cifra en un casi empate (1234,5649999999998 con 2 es «1.234,57»); −0,001 con 2 es
«0,00», nunca «−0,00».

### Las tablas, los tramos y `depreciar`

La congelada de `params.tablas` manda si existe, aunque esté vacía; si no, `entrada.tablas`. **`tabla`:** gana la **primera fila** (en
el orden de la tabla) cuyas columnas del `match` son todas iguales a lo que nombran: un nodo anterior con ese id (la variante, su
clave) o, si no, el campo del vehículo; **igualdad estricta sin conversión** (2024 ≠ "2024"). **`tramo`:** la primera fila con
`desde ≤ sobre ≤ hasta` (extremos incluidos); sin `desde` o `hasta` numérico no coincide nunca.
**`depreciar(d0, tabla, sobre, columna)` = d0 × el `tramo` de esa tabla**.

### En la base

`evaluar_formula(p_def, p_params, p_entrada, p_modo default null)`, STABLE, hace lo mismo que `evaluar()`: recibe las dos columnas de
`formulas` tal cual, el modo completo (NULL de SQL es «sin modo») y **no revalida la fórmula**. `faltantes` y `overrides_descartados`
son **arreglos** (su orden es contrato). Errores de llamada: 22023, código en DETAIL, `donde` en HINT. Se suma con bucle en el orden de
la lista (`supabase/tests/evaluar-formula.sql`).

### En la base

`cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo, p_modo_tc, p_abierta)` y su ayudante `_cotizacion_armar()`
(`security definer`; armar comprueba y lee, la otra llama a `evaluar_formula()`); ver también «En la base» de «Niveles de acceso» (la lectura de una
cotización) y «La hoja abierta».

- **Llamada:** exactamente uno de `p_cotizacion` y `p_origen` (si no, `llamada_invalida`). **Con una cotización:** SU fórmula
  (`formula_id`, nunca la vigente), SUS tipos de cambio congelados y SU vehículo. **Con un origen:** la fórmula publicada
  (`origen_sin_formula`), los tipos de cambio activos de la empresa y `p_vehiculo` opcional (`vehiculo_de_otro_origen`).
- **Lo que tipea la persona** es `p_entradas = {inputs, banderas, overrides, variante}` y nada más (`entradas_invalidas`); la base
  pone `tipos_cambio`, `vehiculo` y `tablas`. **Quién puede:** cotización, `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente y no
  vista dan el mismo 42501); origen, `cotizaciones.crear` y `cotizaciones.ver`. El vehículo se lee sólo con
  `puede_vehiculo(id, 'vehiculos.ver')` y sólo salen los campos que la fórmula nombra.
- **Qué lee:** sólo las tablas que un nodo nombra y la fórmula no congeló (la del origen o, si no hay activa, la compartida con
  `origen_id is null`; «la primera fila» es la de menor `orden` y, repetido, menor `id`); un campo del vehículo es una columna (`anio`,
  `marca`, `modelo`, `kilometraje`, `precio`) o la clave de un campo **activo del origen** (`atributos -> clave`).

## Fórmulas como texto

`compilarExpresion(texto, contexto, medidor?)` (`entities/compilador.ts`) convierte `=(remate+fees)*4%` en nodos del mismo grafo. Puro,
**nunca lanza** (devuelve `{ ok: false, error: { codigo, mensaje, tramo } }`; códigos en `entities/motivos-del-compilador.ts`), sin
recursión, lineal, profundidad máxima 64. Se compila **al configurar**; al cotizar no se evalúa texto. **`texto?` de la fila** (sólo
`constante` y `calculo`): el editor guarda `{ ...raíz compilada, texto }`, de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO` en `nodos.ts`); el
motor lo ignora; otro nodo con `texto` es `forma`.

- **Gramática:** números (con punto: `0,1` es el error `coma`), `4%` (÷ 100, constante `pct`), `+ - * /`, las comparaciones
  `> < >= <= = <>` y `( )`; un nombre es sólo el id de un nodo anterior. Precedencia: `* /`, después `+ -`, después las comparaciones,
  todo asociativo a la izquierda; `a<b<c` es `comparacion_encadenada`. Un texto entre comillas (`"fletes"`) sólo va en BUSCARV o frente a
  la variante con `=`/`<>` (`variante="b"`); en otro lugar, `texto_fuera_de_lugar`. No hay `MULTIPLICAR`/`RESTAR`/`DIVIDIR` ni `HOY()`.
  Un literal es una `constante` en `params`. El compilador sólo lee ids: las referencias A1 y los rangos (`C5`, `C5:C9`) los traduce a
  ids la planilla antes de compilar (`deA1()`, «La planilla»); el léxico lee el `:` (`T.DOS_PUNTOS`) y el compilador lo
  rechaza suelto (`caracter_invalido`).
- **Las diez funciones** (argumentos con `;`, el nombre en mayúsculas o minúsculas): `SUMA(grupo)` (sus miembros) o `SUMA(a; b; …)`
  (uno o más valores; un grupo junto a otros es `grupo_con_otros`); `SI(condición; x[; y])` (con una
  bandera y dos argumentos es el `si` de siempre; si no, `elegir`); `Y(c1; c2; …)` y `O(…)` (dos o más condiciones); `MAX(a; b; …)` y
  `MIN(…)` (un argumento solo tiene que ser un grupo, que se expande en sus miembros); `BUSCARV(valor; "tabla"; "columna"[; VERDADERO|
FALSO])`; `REDONDEAR(x; n)`; `PORCENTAJE_DE(x; pct)`; `DEPRECIAR(x; tabla; sobre; columna)`. Una condición es una bandera, una
  comparación, `variante="clave"`, Y u O; otra cosa es `no_es_condicion`, con un ejemplo armado con el nombre que se escribió.
- **BUSCARV** compila a los nodos de siempre: exacta (sin el cuarto argumento o con `FALSO`) es una auxiliar `tabla` con `match:
{<primera columna de la tabla>: valor}`; con `VERDADERO`, una auxiliar `tramo` con `sobre: valor` (la tabla necesita `desde` y `hasta`:
  `tabla_sin_tramos`). Un valor que no es un nombre va antes a su propia auxiliar; BUSCARV en la raíz deja la fila como `suma` de la
  búsqueda (sólo una `constante` o un `calculo` llevan `texto`). La variante es valor sólo de la exacta (`variante_en_calculo` en la de
  tramo). La tabla y la columna se revisan contra **el catálogo del origen** (`ContextoDeCompilacion.tablas`: clave y columnas de las
  tablas activas del origen y las compartidas; con la misma clave manda la del origen, como al calcular): `tabla_inexistente`,
  `tabla_sin_columnas`, `columna_inexistente`. Sin catálogo (la lectura falló), `tablas_sin_leer`: lo demás compila igual. El núcleo lo
  lee en el servidor para las áreas `formula` y `diseno` (`leerCatalogoDeTablas()`, `tablas_referencia` por `tablas_referencia_origen_id_clave_key`, tope
  `TOPE_DE_TABLAS_DEL_CATALOGO` = 100). Publicar no cambia: la tabla viva se lee al calcular y la congelada manda.
- **Formato:** una comparación, `es_opcion`, Y u O auxiliar es `raw` (vale 1 o 0), y también la raíz de una fila nueva; una fila que ya
  existía conserva su formato.
- **Grafo:** `a+b+c` es UN `suma` (igual `restar` y `multiplicar`); un paréntesis, función o cambio de operación cortan el aplanado;
  `/` nunca se aplana. Cada operación anidada y número es un auxiliar `<destino>__<n>`, `n` desde 1 en **post-orden**; la fila es la raíz
  y no se numera; un id existente es `auxiliar_ocupado`.

### El editor

Lo puro en `entities/formula/`: nunca lanza, no toca lo que recibe y es lineal con el medidor.

- **Fila y auxiliares** (`filasDe()`): las auxiliares de una fila con `texto` son los k nodos de justo antes con ids `<id>__1…k` (recorte
  de `idAuxiliar()` si el id pasa de 37 caracteres, 38 desde `__10`), sin texto propio, cada uno nombrado por exactamente un nodo de la
  cadena o por la fila; si el **texto** de la fila nombra una (`=total__1+remate`), ese nodo es una fila propia. Regla en
  `compilador-auxiliares.ts` (`auxiliaresDe()`); espejo en la base, `_diseno_auxiliares()`.
- **Compilar una fila en su lugar** (`compilarFila()`): el contexto es lo anterior a su primera auxiliar; reemplaza la fila y sus
  auxiliares y quita y suma sus `params`. El tope de 2.000 se mide **en unidades UTF-16** (la base cuenta caracteres):
  `texto_demasiado_largo` desde la unidad 2.001. Conserva `seccion`, `color`, `sobrescribible` (si sigue siendo cálculo) y `condicion`
  sólo como interruptor (en un `SI` la bandera la decide el texto); lo que suelta va en `soltados`. Cambiar o quitar una auxiliar que otra
  fila nombra da `auxiliar_nombrada`.
- **El texto ya no manda** (`textoVigente()`): el ⚙ publica N+1 sin tocar `texto`. Al abrir, si sólo cambió el valor de una constante, se
  **reescribe en su tramo** (`escribirLiteral()`: con `%` se corre el punto, nunca `v * 100`) y la fila queda `reescrito`; si no (no
  compila, otra estructura, un negativo, un `-0`), `no_manda` con su motivo. Recompilar una fila `no_manda` que cambia o quita una
  constante da `pisa_un_valor` hasta `confirmaPisar`: nunca se deshace un ⚙ en silencio.
- **Las filas sembradas** no traen texto: `textoDeNodo()` lo escribe (`a+b+c`, `SI(b; x)`, `a>b`, `v<>"b"`, `Y(a; b)`, `SI(p; x; y)`,
  `MAX(a; b)`, sin «=») sólo si compilarlo da exactamente ese nodo; si no, `null` y la fila se muestra por sus campos. Una búsqueda no se
  escribe: la fila con BUSCARV nació de su texto.
- **La pantalla:** la **planilla** (`features/formula/components/planilla/`, «La planilla», abajo), sobre la fórmula del origen de la URL, una sola
  copia de trabajo que tiene la sesión (`components/sesion/`, `useEditorDeLaFormula` una vez): compila al aplicar con `compilarFila()` (sin
  `validarFormula()` si la fila da error), valida la fórmula de trabajo tras cada cambio (el rechazo, en su fila, en la cabecera de su banda o
  arriba) y la guarda con `formula_guardar_borrador()`. La sesión se vuelve a montar con «Recargar» o si la versión cambia por algo que no hizo
  ella (`otraSesion()`: publicar, descartar, revertir); guardar sobre la publicada no la vuelve a montar. No hay otro editor.
- **Vista previa** (`calcularLaVistaPrevia()`): `evaluar()` con `entradaDePrueba()` (datos en 0, banderas apagadas, variante por defecto,
  sin overrides) y los tipos de cambio y tablas que lee el navegador (`consulta-del-terreno-de-prueba.ts`: la del origen gana a la
  compartida, páginas de 1.000 filas); la congelada manda. La unidad de ejemplo de la planilla calcula sobre ella.

### La planilla

Como una hoja de cálculo: se ven celdas A1 y se guardan ids. Lo puro en `entities/formula/`, O(filas), se recalcula con cada cambio de la
fórmula de trabajo.

- **La hoja** (`hojaDeLaPlanilla()`): las filas en el orden de evaluación (`definicion.nodos`), numeradas de 1 a n. Es el único orden, porque
  «una fórmula sólo usa filas de arriba» sólo es cierto si se ve ese; el tipo de cada fila lo dice el color de su celda, no una banda.
  Columnas: A concepto, B %, C valor y Ejemplo (`contenidoDeLaFila()`). **La B absorbe el %:** una constante `pct` raíz que sólo nombra un `porcentaje_de`
  raíz como su `pct` no tiene fila propia; se ve y se escribe en la B de esa fila y se mueve, duplica y borra con ella (`pctAbsorbidas()`).
  Un `pct` compartido o que es un `input` conserva su fila. Una **banda** es un tramo de filas seguidas con el mismo `grupo`, con su
  cabecera (etiqueta, plazo y tipo de cambio) y sin número; un grupo partido en dos tramos lleva dos cabeceras.
- **Referencias** (`referencias-a1.ts`, `de-a1.ts`): `C<n>` es el valor de la fila n y `B<n>` su %. `aA1()` muestra el texto guardado
  (`remate+fees`) como `=C5+C7`; `deA1()` traduce lo tipeado a ids antes de `compilarFila()` y devuelve cada tramo de error al texto
  tipeado (`tramoEnLoTipeado()`). No distingue mayúsculas, `$` se acepta y se ignora, un nombre con forma A1 siempre es una celda y un id
  tipeado sin esa forma se acepta. Insertar, mover o borrar filas no toca ningún texto. `deA1()` rechaza con su tramo una fila de más abajo
  (con «Mover esta fila debajo de la N» si `puedeMover()`), la propia fila, una que no existe, la columna A, Ejemplo y una B sin % o con un %
  escrito en la fórmula. Los mensajes del compilador y de `validarFormula()` nombran «C5 (Remate)» (`nombrar` del contexto, `mensajeEnA1()`).
- **Rangos:** `C5:C9`, sólo dentro de `SUMA`, `MAX` y `MIN`, en la columna C y con filas de arriba. Se guarda la lista de ids
  (`SUMA(a; b; c)`) y al mostrar tres o más filas seguidas vuelven a ser un rango. No hay recálculo automático: con una fila insertada en
  medio se ve `SUMA(C5:C6; C8:C10)`.
- **Escribir** (`textoDeLaCelda()` abre la edición, `aplicarLoEscrito()` la aplica): A, el concepto (hasta 80 caracteres); B, el % de la
  fila; C según su tipo de celda; Ejemplo, el valor de la unidad de ejemplo. **Qué se escribe dónde:** C es lo que guarda la fórmula. Con `=`
  se compila: una constante, una fila del asesor, un dato del vehículo, un interruptor o una variante pasan a cálculo. Sin `=`, el valor de una
  constante (un cálculo pasa a valor fijo); en una fila que se llena al cotizar, C no toma un número (se dice que su ejemplo va en Ejemplo) y
  vacía no cambia nada. Ejemplo se escribe sólo en esas filas (`escribirEnElEjemplo()`: número, Sí/No u opción); en un valor fijo dice que se
  escribe en C y en lo demás que se calcula sola. Un tipo de cambio y una tabla no se escriben en C. `fx ▾` (`insertarFuncion()`) pone la
  función con el cursor antes del paréntesis que cierra (`=SUMA()` en vacío; sin `=`, envuelve lo escrito: `=SUMA(100)`). Mientras el
  cursor espera un operando, un clic en otra celda inserta su referencia (Shift+clic, un rango); cada referencia lleva su color en el orden en que aparece (`referenciasTipeadas()`, `--viz-series-*` en ciclo), la leyenda y el
  borde de su celda. El autocompletar (`sugerencias()`) ofrece las funciones, los conceptos de arriba («Remate → C5»), las bandas («Primer
  pago → SUMA(primer_pago)») y, en BUSCARV, las tablas y sus columnas; «¿Cómo se escribe?» explica las diez (`FUNCIONES_DE_LA_AYUDA`).
  Las operaciones rápidas (`insertarOperacion()`, `entities/formula/operaciones-rapidas.ts`) insertan `=␣+␣`, `=PORCENTAJE_DE(␣; ␣%)` y
  `=SI(␣; ␣; ␣)`: cada ␣ es un lugar por llenar sin texto, guardado como distancia al final (`EdicionDeLaCelda.lugares`), que no cambia mientras
  se llena de izquierda a derecha; `siguienteLugar()` (Tab, «Siguiente»), `podarLugares()` al tipear y `saltoTrasReferencia()` (tras tocar una
  celda, salta un `+ - * /` hasta el lugar). «Porcentaje de» usa `PORCENTAJE_DE` porque deja el % en la columna B. Dentro de una función, el
  renglón bajo la barra muestra su firma con el valor actual (`firmaEnElCursor()`, sobre el marco de `recorrerTexto()` y los `argumentos` de
  `AyudaDeFuncion`). **El resultado al lado** (`resultadoAlLado()`): con una C que empieza con «=», compila lo tipeado como al aplicar
  (`aplicarLoEscrito()` con `confirmaPisar`), valida la fórmula que resultaría y la calcula con la unidad de ejemplo (`calcularLaVistaPrevia()`);
  sólo da `valor` o `texto`. Corre 150 ms después de la última tecla (`PAUSA_DEL_RESULTADO_MS`), O(filas) por pausa, y sólo se muestra si su
  pedido (lo tipeado, la fila, la unidad, el modo y la fórmula de trabajo) es el de ahora: nunca una cifra vieja. Los mensajes del compilador
  (`motivos-del-compilador.ts`) hablan de celdas y valores, una frase cada uno («Falta cerrar un paréntesis.»); `mensajeEnA1()` los nombra en A1.
- **Qué muestra cada columna** (`contenidoDeLaFila()`, una vez por fórmula de trabajo, no al tipear): C, el valor fijo, el cálculo en A1
  («=C5+C7») o de dónde sale en corto; Ejemplo, nada en un valor fijo (la misma cifra no se dibuja dos veces), lo de la unidad en las filas que
  se llenan al cotizar y la cifra en las demás. «De dónde sale» completo va en la línea bajo la barra.
- **Filas:** `insertarFila()` (arriba o abajo: un «Valor fijo» en 0 llamado «Fila nueva», con la banda de la de referencia; el id sale de
  `idDeFilaNueva()` y nunca se ve), `duplicarFila()` (id nuevo, el texto recompilado en su lugar y la `pct` absorbida clonada),
  `moverFila()` (Alt+↑/↓, arrastrar el número y «Mover esta fila debajo de la N»: bajar r debajo de t vale si ninguna fila de (r, t] la
  nombra; subirla, si ella no nombra ninguna de las que salta; se mueve el bloque, la `pct` absorbida, las auxiliares y la raíz) y
  `eliminarFila()`, rechazada con su motivo (`motivoParaNoEliminar()`): la usa otra fila, es el tipo de cambio de una banda, un bucket o el
  total, es la fila del total o la única de su banda, la muestra la hoja (`nodosDelDiseno()`) o la nombra la tarjeta de trabajo
  (`NombradoPorLaTarjeta`). Eliminar una fila y quitar una banda se deshacen una vez, desde su aviso.
- **Decimales** (`cambiarDecimales()` de `entities/formula/decimales-de-la-fila.ts`): «⋯» › «Decimales…» abre su panel (`?panel=decimales&fila=<id>`) con
  «Automático» y 0 a 4 y el ejemplo con una cifra fija («Se ve así: USD 1.234,57 → USD 1.235»). Pone o quita `decimales` del nodo de la fila y se aplica
  sólo si `validarFormula()` sigue valiendo; no toca el cálculo. El renglón no está en una fila que se ve como texto (`aceptaDecimales()`) ni en un dato
  del vehículo que no es número (`datosQueNoSonNumero()`, con los campos del origen que lee `useCamposDeLaFormula()`), y se apaga mientras la fila
  espera a guardarse. Cambiar el tipo de celda o reescribir el texto de la fila los conserva si sigue siendo un número (`CON_DESTINO`). El % que la B
  absorbe no tiene fila: queda en «Automático». La columna Ejemplo usa los decimales de la fila.
- **Tipo de celda** (`tipoDeCelda()`, `cambiarTipo()`): los ocho del glosario. Cambiarlo conserva id, etiqueta, descripción, salida y banda (si
  la fila sigue sumando) y se aplica sólo si `validarFormula()` sigue valiendo. Una sola variante por fórmula.
- **Bandas y tipos de cambio** (`bandas.ts`, `buckets.ts`, `total-de-la-formula.ts`): crear una banda (al final de `grupos`, con al menos una
  fila y, si la fórmula no tiene, el tipo de cambio del total), quitarla (sus filas quedan sin banda; rechazado si un texto la nombra o la
  tarjeta de trabajo la usa), editar su etiqueta, plazo, color y tipo de cambio (`aplicarGrupo()`) y poner o sacar una fila (`ponerEnBanda()`;
  arrastrarla a otro tramo hace lo mismo). El tipo de cambio de una banda es una fila `tipo_cambio`: se usa el bucket que ya apunta a ella o
  se crea uno con su clave (`bucketPara()`). Con modos en la hoja no se crea ninguno, porque los modos llenan exactamente los buckets de la
  fórmula; sin modos, los que quedan sin uso se limpian (`sinBucketsSueltos()`). «Total y tipos de cambio» edita `total_en`, la fila del
  total (`salida: 'total'`) y el tipo de cambio de cada bucket. Mover una fila a otro bucket cambia el total en Bs en su USD × (tc nuevo −
  tc viejo); el doble conteo lo dice la validación. `SUMA(<banda>)`, `MAX` y `MIN` guardan las filas que la banda tenía al compilarse: lo que pone o
  saca filas de una banda vuelve a compilar las filas que la nombran (`sumasDeBandaAlDia()`), con el texto reescrito si un ⚙ lo cambió; si una no
  se puede (su texto ya no manda o una fila de la banda quedaría debajo de ella), el cambio no entra y dice por qué.
- **De dónde sale** (`deDondeSale()`): cada fila en palabras con las etiquetas (nunca ids): una frase por tipo de nodo y por operación, las
  auxiliares en línea (una constante con su valor, un cálculo entre paréntesis, una comparación auxiliar sin ellos, una búsqueda como «de la
  tabla `<clave>` por …», con la clave de la tabla y no su nombre); nunca lanza y es lineal. `cambiarValorDeConstante()`
  (`valor-en-la-planilla.ts`) escribe `params[id]` como el ⚙ y reescribe el texto de la fila que la contiene (`textoVigente()`); si el texto
  no puede decirlo queda `no_manda`.
- **La unidad de ejemplo** (`unidad-de-ejemplo.ts`: `inputs`, `banderas`, `vehiculo` por campo y la variante) se calcula con
  `calcularLaVistaPrevia(formula, terreno, unidad, modo)`: `entradaDeLaUnidad()` suelta lo que la fórmula ya no tiene, `modoDelMotor()` pasa
  el modo del diseño al motor y un modo que no cubre un bucket da `no_calcula`. `totalesDeLaUnidad()` arma «Totales» y `calculoDeLaUnidad()`
  la tarjeta en vivo (sólo los ids que su lectura nombra).

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y el permiso `empresa.tipos_cambio.gestionar`. **La cotización congela** en `tipos_cambio` lo que usó; el
  asesor puede sobrescribir uno si su celda es editable para su nivel. El ⚙ es `tipo_cambio_guardar` (afecta a todos los orígenes).
  **Publicar no comprueba** que `tipos_cambio` tenga la clave de cada nodo `tipo_cambio`: `cotizacion_evaluar()` lo da como faltante.
- **Un modo** lo declara el diseño; el elegido se guarda en `cotizaciones.modo_tc`. **El motor lo recibe completo**, con la forma de la
  fórmula: `{ buckets: {bucket: id de nodo tipo_cambio}, total_en }` (`ModoDeCambio` en `entities/formula.ts`). Un modo es otro mapa, no
  otra cuenta. **Límite:** `cabecera.moneda_bs` es la de la versión, no la del modo elegido; un modo cuyo `total_en` tenga otra `moneda_a`
  escribiría el total en Bs con la de la versión (hoy todos los tipos de cambio son USD → BOB).

## El diseño de la hoja (D7)

`formulas.diseno` (jsonb), versionado y publicado con la fórmula (un cambio de diseño publica la N+1). Lo validan `validarDiseno()`
(`entities/validar-diseno.ts`, sobre el Zod de `entities/diseno.ts`) y `validar_diseno()` en la base, con juego
(`entities/casos-de-diseno.json`) y corpus. **Declarativo:** nada de CSS, clases, HTML ni hex.
Forma: `{ cabecera: {modos[], ver_total_bs, …aspecto, modo_por_defecto?, ver_total_bs_por_defecto?, modos_visibles?}, secciones[],
tarjeta_total: {nodo, secundarios[]}, avanzado?: {fila} }`.

- **`cabecera.modos[]`** `{clave, nombre, buckets: [{bucket, nodo}], total_en}`: nombra **nodos `tipo_cambio`** (no claves) y llena
  **exactamente** los buckets de la fórmula; no hay modos en una fórmula sin `total_en`.
- **Lo que la cabecera trae por defecto** (opcional; sin eso, todo como siempre): `modo_por_defecto` (la clave del modo con que abre una
  cotización nueva; sin él, el primero), `ver_total_bs_por_defecto` (booleano: «Ver total» encendido al abrir una nueva; sin él, apagado) y
  `modos_visibles` (las claves de los modos que se dibujan en el encabezado, en cualquier orden; sin la lista, todos). Una guardada abre con
  lo suyo, y **el modo que tiene elegido se dibuja aunque no esté entre los visibles**: la visibilidad es del encabezado, no una regla de
  guardado (`_cotizacion_modo` acepta cualquier modo del diseño).
- **`secciones[]`:** `id`, `titulo?`, `presentacion` (`principal`/`avanzado`), `posicion`, `nivel_ver?`/`nivel_editar?` (los heredan sus ítems),
  `items[]`. Las `avanzado` van juntas en **un** modal «Avanzado», en el orden de la lista; su `posicion` sólo las ordena.
- **La rejilla** (`docs/GLOSARIO.md` › «Rejilla de la hoja», `entities/rejilla-de-la-hoja.ts`): cada sección y cada ítem lleva
  `posicion: {columna, fila}` (columna 1 a 12, fila 1 a 200), dónde empieza en su rejilla: las principales en la de las secciones, los ítems en la de
  su sección. Ocupa `ancho` columnas y `alto` filas desde ahí (el `alto` vale también a 12 columnas). **Los huecos se respetan y nada se corre
  solo:** una fila sin ninguna pieza mide 2,5 rem. `avanzado.fila` es la fila entera del **bloque «Avanzado»** (el total suelto, el botón y el cierre);
  sin la clave, va debajo de la última. Una sección sin `ancho` es «Automática»: 6 columnas desde 64 rem del contenedor de las secciones. **El corte
  de la rejilla:** cada pieza de N columnas pide que le toquen 16 rem (`corteDe()`) y la rejilla entera dibuja las posiciones desde el corte de la más
  exigente (`corteDeLaRejilla()`); por debajo, como al 200 %, apila sus piezas en **orden de lectura** (fila y luego columna), que es también el del DOM,
  el del `Tab` y el del lector de pantalla.
- **La conversión al leer:** un diseño sin ninguna `posicion` ni `avanzado` es de flujo (lo escribe `_fdo_formula_en_blanco()` y lo traen las
  versiones de antes) y se lee en la rejilla con el **mismo dibujo** que le daba el flujo a lo ancho de escritorio (`disenoEnRejilla()`, espejo de
  `_diseno_en_rejilla()`, con el juego `entities/casos-de-rejilla.json`, 210 casos): cada pieza, en el lugar que CSS le daba sin `dense`
  (`colocarEnFlujo()`); el bloque, en la fila donde aparecía la primera avanzada, y sin el `alto` que a 12 columnas no hacía nada. Es idempotente y
  tolerante (lo que no tiene forma lo rechaza la forma), y ninguna versión guardada se reescribe: el editor guarda la rejilla al guardar.
- **`items`:** `celda` (`nodo`, `ancho`, `secundario?`, `ayuda?` = de 1 a 8 **bloques** en orden (`docs/GLOSARIO.md` › «Bloque de la ayuda»):
  `titulo`, `texto` (con saltos de línea y `**negrita**`, lo único que se interpreta), `enlaces` (de 1 a 5 `{titulo, url}` —título de 1 a 60
  caracteres, URL `https://` de hasta 2000—) y hasta 3 `tabla` (`{tabla, columnas?: [{columna, llena?}], resaltar?}`: sin `columnas`, todas las de
  la tabla en su orden y sin llenar nada; `llena`, el nodo de la celda que recibe el valor tocado; `resaltar`, la fila que casa con el vehículo).
  Una ayuda `{texto, enlaces?}` o `{tabla}` también se acepta y se lee como bloques (`ayudaEnBloques()`, espejo de
  `_diseno_bloques_de_la_ayuda()`); el editor la guarda en bloques en cuanto se toca. `nivel_ver?`, `nivel_editar?`; **el
  candado se deriva** —cálculo, dato del vehículo, condición apagada, otra variante o nivel que falta— y siempre dice su motivo; **el
  par porcentaje-monto es una sola celda**, con `secundario`); `atajos` (un nodo `tabla` sobrescribible, su `columna` y hasta 12
  `filas` como chips); `variante` (el nodo `opcion` como chips; obligatoria si hay variante); `interruptor` (una `bandera` con `efecto`
  `habilita`, que deshabilita lo que condiciona, o `muestra`, que apagada no lo dibuja; toda bandera que condiciona algo o pide un dato
  tiene su interruptor); `subtotal` (un `calculo` como franja); `total` (**la tarjeta del total como pieza**: sin `nodo`, que sigue en
  `tarjeta_total.nodo`, con el aspecto de todo ítem; dice en qué sección y lugar la dibuja la hoja, a todo el ancho; sin ella, la tarjeta va sola arriba de «Avanzado»).
- **El aspecto** (`docs/GLOSARIO.md` › «Aspecto»): claves planas y opcionales, de escalas cerradas; sin la clave, lo de siempre. Ítem:
  `ancho` (la celda, obligatorio: `completo`|`mitad`|`tercio` o un entero de 1 a 12, y los con nombre valen 12, 6 y 4; los demás ítems, un
  entero de 1 a 12, sin él la fila entera), `alto` (1 a 4 filas), `letra` (`chica`|`normal`|`grande`) y `enfasis` (`normal`|`fuerte`).
  Sección: `ancho` (1 a 12; sin él, «Automática»), `alto`, `relleno` (`chico`|`medio`|`grande`), `separacion` (`chica`|`media`|`grande`),
  `densidad` (`compacta`|`comoda`), `letra`, `enfasis` y `tono` (una clave del catálogo). Cabecera: `tono`, `relleno`, `letra` y `enfasis`
  (no lleva ancho ni alto: va sola en su fila). Los enteros se leen como JS (`0.99999999999999999` es 1). La tarjeta suelta (sin la pieza) no lleva
  aspecto; la pieza `total`, el de todo ítem.
  Lo dibuja la **rejilla de la hoja** (arriba; clases en `features/hoja/components/clases-de-la-rejilla.ts` y `clases-de-la-posicion.ts`); el PDF y
  la tarjeta no lo siguen.
- **`tarjeta_total`:** el nodo total y sus `secundarios` (`aparte`). Un nodo aparece a lo sumo una vez. Nivel efectivo de un ítem: el
  suyo (sólo la celda), si no el de su sección, si no `todos`. El diseño no lleva `solo_en`. **El tono de una celda es el del grupo de la
  fórmula** (`definicion.grupos[].tono`); el de una sección pinta su borde y sus celdas sin grupo, sus franjas y sus chips (no su fondo ni sus
  textos sueltos); el de la cabecera, sus chips de los modos.

### Las reglas

**Primero la forma (`forma`)**, el Zod de `diseno.ts`; **después, el tamaño (`demasiados_items`)**: a lo sumo 40 ítems sumando todas las
secciones (principal o avanzado; la cabecera y `tarjeta_total` no cuentan, la pieza `total` sí), con `donde` = la sección en la que la suma pasa del tope
(`MAXIMO_DE_ITEMS_DEL_DISENO`; en la base, `_diseno_maximo_de_items()`). El borrador lo admite; publicar lo rechaza. **Después, 42 reglas
cruzadas** con código estable (lista en `entities/motivos-de-diseno.ts`; `donde` = id del nodo, sección, modo o grupo; en la base,
`hint`), en pasadas: §1 los modos; §1b lo que la cabecera trae por defecto, todas con `donde` = `cabecera` y en este orden:
`modo_por_defecto_inexistente`, cada modo visible en orden (`modo_visible_inexistente` y después `modo_visible_repetido`),
`modo_por_defecto_oculto` (el modo por defecto efectivo —el escrito o el primero— no está entre los visibles; también la lista vacía) y
`ver_total_bs_por_defecto_no_ofrecido` (encendido sin `ver_total_bs`; apagado siempre vale); §2–5 las secciones, la tarjeta, los atajos y la
cobertura (en §2, la pieza `total` se revisa entera antes de buscar un nodo, con `donde` = su sección: `total_repetido` —una sola en el
diseño—, `total_en_avanzado` —sólo en una sección principal— y `total_con_nivel` —su sección no lleva `nivel_ver`: la ven todos—; no es el
dibujo de un nodo, así que no cuenta para `nodo_repetido`, los atajos ni la cobertura; también en §2, **la geometría** (`validar-diseno-rejilla.ts`),
la sección tras sus reglas y cada ítem tras las suyas: `pieza_fuera_de_la_rejilla` —se sale de las 12 columnas o de las 200 filas— y
`piezas_se_pisan` —la primera, en el orden de la lista, que cae sobre una celda ocupada—, con una ocupación para las principales (con la fila del
bloque ya marcada), otra para las avanzadas y otra por sección; `donde` = el nodo, o la sección si la pieza es ella o la tarjeta del total); §6 `tono_inexistente`, que revisa el tono de cada grupo, después el de la cabecera (`donde` = `cabecera`) y después el de cada
sección (`donde` = su id); §7 la ayuda, celda por celda en el orden del diseño y bloque por bloque (`revisarAyudas()`, espejo de
`_diseno_ayudas()`; `donde` = el nodo de la celda): `ayuda_enlace_no_https` (la URL de un enlace cumple `^https://[!-~]+$`, ASCII imprimible sin
espacios, la misma clase en JS y en Postgres: `URL_DE_ENLACE`); **sólo con el catálogo de tablas del origen** (el que trae publicar a mano,
`_tablas_del_catalogo()`: las activas del origen y las compartidas, la del origen gana), `ayuda_tabla_inexistente` y, columna por columna,
`ayuda_columna_inexistente` (una ayuda `{tabla}`, sin bloques, no se mira contra el catálogo: la hoja la deja caer si no está); y siempre
`ayuda_llena_no_acepta_valor` (lo que `llena` nombra es un nodo con celda en el diseño —o el porcentaje de una con secundario— que la hoja deja
escribir: un dato que se tipea, una constante o un cálculo que se puede pisar; un tipo de cambio, no). Sin catálogo (el borrador, la N+1 de una
tabla, el ⚙, revertir) esas dos no corren: la N+1 de una tabla publica aunque la ayuda nombre una columna que ya no está, y el editor lo marca en el
bloque. La forma de un bloque (los tipos, los topes, los largos, una columna repetida en el bloque) es `forma`; la de la
posición, también: en la base, D100–D103 (la de una sección), D104–D105 (`avanzado`) y D106–D109 (la de un ítem), con el mismo campo que Zod
(`diseno.secciones.0.posicion.columna`). El juego `casos-de-diseno.json` tiene 506 casos, una regla por caso. Las de nivel: `nivel_no_admitido` (el total, lo `aparte` o la variante con nivel efectivo de ver que no es «todos»: la base
siempre manda el total y lo `aparte`) y `editar_sin_ver` (ver restringido con editar ausente o «todos»; **ver abierto con editar
restringido vale**). El primero que falla manda. **La definición llega ya validada.** `validar_diseno(def, diseno, niveles, retirados,
tonos)`: STABLE, invoker, `search_path` vacío, 22023 con la regla en DETAIL y `donde` en HINT.

Una `constante` auxiliar de un número escrito en el texto de su fila no pide celda (`nodo_sin_seccion` no la nombra): se edita por ese
texto, y lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`. Si tiene celda, vale como siempre; una fila constante sí
la pide.

### En la base

- **`formulas.diseno` y `formulas.visibilidad`** (jsonb): nulas sólo en un borrador. **Publicar exige el diseño** (22023
  `diseno_faltante`; `check` `formulas_publicada_con_diseno`, también en las archivadas).
- **La rejilla:** `_diseno_en_rejilla(diseño)` (STABLE, invoker, `search_path` vacío, nunca lanza) convierte un diseño de flujo; la llaman primero
  `_diseno_forma()`, `validar_diseno()` y `_cotizacion_hoja()`, que manda la `posicion` de cada pieza y `avanzado` con el aspecto.
- **Guardar:** `formula_guardar_borrador(origen, definición, params, diseño, nota?, …)` valida la fórmula y sólo la **forma** del diseño.
  Desde la Hoja, la definición va con los rótulos y formatos que el inspector editó (`edicion-de-nodos.ts`; sin cambios, la leída).
  **Publicar** (`formula_publicar()` → `_publicar_formula()`; el ⚙ y revertir → `_publicar_version()`): toma el borrador `for update` y
  los tonos de sus grupos y de su diseño (`_tonos_de_grupos()` y `_tonos_del_diseno()`) `for key share`, valida fórmula y diseño completo
  (`_preparar_publicacion()`) y compila `visibilidad`. Dos a la vez: PT409 («Versiones»). `validar_diseno()` lee las secciones
  del diseño una vez a una variable: un diseño fuera de línea (TOAST) se relee entero en cada `->`.
- **`visibilidad`** = `{nodo: {ver, editar}}` con **claves de nivel**, no permisos (`_compilar_visibilidad()`): cada ítem da su nodo con
  su nivel efectivo (y el `pct` de una celda con `secundario`); el total y lo `aparte` tienen `ver: todos`; lo que no se dibuja entra
  como `{ver: todos, editar: null}`. Lo que no figura no viaja, salvo a quien configura.
- **Colores** (nombre técnico heredado: la tabla `tonos` y las RPC `tono_*`; clave, nombre, `hex` y fondo/borde/tinta en claro y oscuro):
  sólo por `tono_crear(p_id, p_nombre, p_hex)`, `tono_guardar(…, {nombre?, hex?})` y `tono_eliminar` (`cotizaciones.configurar`; las tres
  devuelven la lista entera); hasta **48**. **La hoja se deriva del hex en la base** (`_color_derivar`, espejo de `derivarColores()` en
  `entities/colores.ts`, probado con `supabase/tests/casos-de-colores.json`) con AA garantizado (tinta sobre fondo ≥ 4,5:1) y se guarda en
  `claro_*` y `oscuro_*`; guardar el mismo hex no vuelve a derivar. El texto sobre un color en la hoja va en su **tinta**; en la tarjeta, el
  de `_color_tinta_de_la_tarjeta()`. Un color o un nivel que alguna versión nombra no se elimina (23503): `_tono_en_uso()` busca la clave en
  los grupos (`formulas_tonos_idx`) y en la cabecera y las secciones del diseño (`formulas_tonos_del_diseno_idx`, GIN sobre
  `_tonos_del_diseno(diseno)`).
- **La fórmula sólo la lee quien la configura** (`cotizaciones.configurar` del origen), y `formula_auditar()` no copia `definicion`,
  `params`, `diseno` ni `visibilidad` a `actividad`. Semilla: `subasta_usa`, `planilla_usa`, `oficina` (`supabase/semillas/`).

### Fórmulas del origen

- **Un origen tiene una o más fórmulas con nombre** (`formulas_del_origen`, nombre de 1 a 60, único en el origen sin distinguir mayúsculas,
  también entre las archivadas). Cada una tiene su borrador, sus versiones (`formulas.formula_del_origen_id`), su diseño y su plantilla de
  tarjeta (`plantillas_tarjeta.formula_del_origen_id`). Las dos FK son compuestas, `(origen_id, formula_del_origen_id)`: una versión nunca
  cuelga de la fórmula de otro origen. Se lee con `cotizaciones.configurar` del origen y se escribe sólo por RPC.
- **La activa** (`activa`, a lo sumo una por origen: `formulas_del_origen_activa_unica`) es la que se cotiza: la hoja, el cálculo por
  origen, `formula_para_cotizar()`, crear, cotizar encima y la publicada que ofrece una hoja guardada leen la publicada de la activa
  (`_publicada_de_la_activa()`). Una activa siempre tiene publicada y no está archivada. Un origen sin activa se ve «sin publicar».
- **La de trabajo** es la que editan las RPC de la fórmula y de la plantilla cuando no reciben `p_formula_del_origen`: la activa; si no hay,
  la más nueva sin archivar; si no hay ninguna, guardar crea «Fórmula» («Fórmula 2»… si el nombre está tomado). Con el id, la de ese origen
  (otro origen o una que no existe: el mismo 42501 del permiso; una archivada: 22023 «Esta fórmula está archivada.», hint
  `formula_del_origen`).
- **La primera publicada de un origen sin activa la activa** (`trg_fdo_asignar`, que también cuelga de la de trabajo una versión o una
  plantilla insertada sin fórmula del origen, como las que insertan directo las pruebas y el e2e; corre también con
  `session_replication_role = replica`).
- **«Guardar con la N»** vale mientras la versión abierta no lleve más de 24 h reemplazada: por una versión posterior de su fórmula o porque
  su fórmula dejó de ser la activa (`desactivada_en`), lo primero que pasó.
- **La tarjeta de una versión** se dibuja con la plantilla publicada de **su** fórmula del origen, y la huella de la imagen se mueve con esa
  plantilla.
- **Las RPC** (todas con `cotizaciones.configurar` del origen antes del candado; la que no existe da el mismo 42501; las de una que ya existe, con
  su `actualizado_en` esperado y PT409 con quién y cuándo, `_conflicto_de_edicion()`; candados `formulas:` y después `plantillas:` del origen,
  y la fila `for no key update`):
  - `formula_del_origen_crear(id, origen, nombre, copia_de?, pieza?)`: en blanco (fórmula con un tipo de cambio y tarjeta de omisión) o copia
    de la publicada o del borrador (`pieza`) de otra, del mismo origen o de otro (copiar de otro origen pide configurar también allí). **Nace
    como borradores, sin versión**: nunca toca lo que se cotiza. Idempotente por `id` (otros datos: PT409); tope de 50 sin archivar (22023,
    hint `formulas`); nombre repetido: 23505, hint `nombre`. Una copia de otro origen usa las tablas del destino que tengan la clave, crea
    las que falten con las filas de la copia, y queda marcada (`copiada_de_otro_origen`, también la copia de una copia) hasta que sus datos
    del vehículo existan en el destino: publicar y activar los exigen. Devuelve `{ id, actualizado_en, avisos }` (las tablas usadas o
    creadas y los datos que faltan).
  - `formula_del_origen_renombrar(id, esperada, nombre)` (también archivada) y `formula_del_origen_archivar(id, esperada)` devuelven el
    `actualizado_en` nuevo; una archivada no se edita ni se activa (22023, hint `formula_del_origen`).
  - `formula_del_origen_eliminar(id, esperada)`: sólo la que nunca estuvo activa ni se usó para cotizar (si no, 23503: archivarla), con sus
    versiones y su tarjeta.
  - `formula_del_origen_activar(id, esperada, nota, activa_esperada, borrador_esperado, publicada_esperada, plantilla_borrador_esperado,
plantilla_publicada_esperada)`: cada pieza con su esperada (la activa que se vio: PT409 «Ana activó «Planilla» hace 2 min.»). Pide nota,
    alguna versión de la fórmula y alguna tarjeta. Publica con esa nota el borrador de la fórmula (o, en una copia marcada, exige los datos del
    vehículo) y el de la tarjeta, validado contra la publicada de esa fórmula; sin borrador de tarjeta, valida la publicada contra la versión
    que se va a cotizar. Después apaga la activa anterior (`desactivada_en`, `formula_del_origen.desactivar`) y prende ésta. Activar la activa
    sólo publica lo pendiente. Un error corta todo.
  - La archivada o la activa no se archivan ni se eliminan (22023, hint `activa`: activar otra primero). `actividad` registra
    `formula_del_origen.crear|renombrar|archivar|eliminar|activar|desactivar`.
- **La pantalla** (área `formulas-del-origen`; `docs/UX.md` › «Cotización: fórmulas del origen (estados propios)»): el selector de la barra de la fórmula,
  arriba de las pestañas Planilla, Hoja y Tarjeta de la página del origen (`/configuracion/origenes/<id>/planilla|hoja|tarjeta`), lista las del origen
  (51 por `formulas_del_origen_origen_idx`, la activa primero; las archivadas aparte, de a 20 por cursor hasta 500) y llama a las cinco RPC. La elegida va
  en `?formula=<id>`: la pestaña lee esa fila por PK (`leerLaFormulaDelOrigen()`, con `cache()`) y sus lecturas y escrituras llevan **el id de la URL**
  (`p_formula_del_origen`); sin `?formula=`, o con una de otro origen o que no existe (con su aviso), la de trabajo, leída como quien pide; una archivada
  no se edita.

### Versiones

- **Una serie por fórmula del origen:** a lo sumo un borrador y una publicada (`formulas_borrador_unico`, `formulas_publicada_unica`; el número,
  `formulas_formula_del_origen_id_version_key`); publicar archiva la publicada. Guardar, descartar y publicar el borrador y revertir escriben
  en la de `p_formula_del_origen` o, sin él, en la de trabajo; el ⚙ (constante y cabecera), en la activa. Todas toman el candado del origen (`pg_advisory_xact_lock(hashtextextended('formulas:' || origen, 0))`) después del
  permiso (42501 antes de cualquier PT409) y, en guardar, de la validación; recién después leen la publicada y comparan con su esperada.
- **Versión de origen** (`formulas.version_origen_id`): la publicada sobre la que se empezó el borrador (la escribe
  `formula_guardar_borrador()` al crearlo; pisarlo no la cambia). Publicarlo cuando ya no es la publicada: PT409 «Después de que empezaste
  este borrador, Ana publicó la versión 3 hace 2 min.». Nula (no había publicada o fila escrita fuera de las RPC): no se compara.
- **El ⚙** (`formula_cambiar_constante(origen, nodo, valor, publicada_esperada?)`, `cotizaciones.configurar`): publica la N+1 desde la
  publicada (definición y diseño, `params` con el valor nuevo; un nivel retirado no lo frena), **sin crear ni tocar el borrador**.
  Esperada nula = la publicada que lee al entrar; el mismo valor da 22023 (hint `valor`).
- **El ⚙ de la cabecera** (`formula_cambiar_cabecera(origen, modo_por_defecto, ver_total_bs_por_defecto, modos_visibles, publicada_esperada?)`,
  `cotizaciones.configurar`): publica la N+1 desde la publicada con las tres claves por defecto de la cabecera escritas siempre juntas (definición
  y `params` iguales), **sin crear ni tocar el borrador**. Mismo contrato que el ⚙ de una constante: el permiso primero, la esperada (PT409 con
  quién y cuándo), `_publicar_version()` (candado, validación entera del diseño, `formula.publicada` con `despues.cabecera`). 22023 con hint
  `cabecera` si la publicada no tiene modos o ya tiene esos valores (los efectivos: lo que falta vale el primer modo, falso y todos). La hoja
  lo dibuja sólo con `cabecera.ajustes`; «Aplicar también a esta cotización» cambia la hoja abierta como si la persona eligiera.
- **Revertir** (`formula_revertir(origen, versión, nota, publicada_esperada)`, sin defaults, `cotizaciones.configurar`): publica la N+1
  como copia de una **archivada** (definición, params y **diseño**), sin tocar el borrador. Rechaza la publicada, un borrador, otro origen o
  inexistente (mismo texto) y la esperada nula (22023); un nivel retirado en ese diseño da 22023 `nivel_retirado`. `actividad` registra
  `formula.publicada` con `copia_de` y `version_copiada`.
- **El conflicto dice quién, cuál y cuándo** (`_version_publicada_por()`), sin «Recarga»: «Publicaste…», «Ana publicó…» u «Otra persona
  publicó…» (sin quién o sin nombre); sin `publicado_en` se quita el «hace…». Esperada en un origen sin publicada: «La versión que tenías
  ya no es la publicada, y el origen no tiene otra.». Se muestran tal cual.
- **La versión esperada del borrador:** `formula_guardar_borrador(…, nota, publicada_esperada?, actualizado_en_esperado?)` **sin hora
  crea**: con borrador, PT409 «Ya hay un borrador: lo empezó Ana y se guardó hace 2 min.» («lo empezaste tú», «lo empezó otra persona»);
  con la publicada cambiada, «Mientras editabas, Ana publicó la versión 4 hace 2 min.». **Con hora pisa** sólo si es la del borrador y
  devuelve `{id, actualizado_en}` para volver a guardar sin releer. `formula_descartar_borrador(origen, actualizado_en_esperado?)` y
  `formula_publicar(…, publicada_esperada?, actualizado_en_esperado?)` con hora: «El borrador cambió después de que lo abriste: se guardó de
  nuevo hace 2 min.» o «El borrador que abriste ya no está: se publicó o se descartó.» (publicar mira antes la publicada). Sin hora toman el
  que haya («No hay borrador»). La app manda siempre las esperadas; la base acepta la nula (excepción aprobada a
  `.claude/rules/migraciones.md`).
- **Dónde se ven:** cada fórmula en la pestaña «Planilla» de la página del origen (`/planilla?formula=<fórmula>`): publicada, borrador (atrasado si su versión de origen ya no es la
  publicada) y versiones por cursor (en el drawer «Versiones» de la barra de la fórmula), sin lo oculto (`docs/UX.md` › «Cotización: fórmula (estados propios)»); ahí se publica con nota, se
  descarta (`<Confirmar>`) y se revierte.
- **Carreras** (`scripts/carreras/tonos.mjs`, `formula-mixtas.mjs`): dos publicar, dos ⚙, el ⚙ contra publicar el borrador, revertir contra
  el ⚙ y el ⚙ de la cabecera contra el de una constante y contra publicar, en los dos órdenes: la segunda da PT409 y nada se pisa.

### La cotización aprobada

Cada vehículo tiene a lo sumo una **cotización aprobada**: la fila de `cotizaciones_aprobadas` (clave primaria `vehiculo_id`, `cotizacion_id`
único) con su **primer resultado** congelado: `monto` = `totales.usd` y `moneda` = `USD` (`_cotizacion_primer_resultado()`, espejo de
`entities/primer-resultado.ts`: lo que la hoja dibuja primero en la tarjeta del total; nulo si no es un número) y las copias `origen_id`, `creado_por` y
`lead_id`. Es una tabla aparte, no una columna: aprobar no mueve la versión de ninguna cotización ni toca `vehiculos`, y `authenticated` lee `vehiculos`
entera (el monto llegaría a quien ve el vehículo y no la cotización). Su policy espeja «cotizaciones: leer» sobre las copias: la fila y el monto los ve
exactamente quien ve esa cotización; sin escritura para `authenticated`.

**La regla única** (`_aprobada_reponer(vehículo)`): _activa_ = con ese vehículo, fuera de la papelera y no `invalida` (una `reportada` cuenta). Si la
fila apunta a una activa del vehículo, se queda (se refrescan monto y copias si cambiaron); si no, pasa a **la más antigua activa** por `(creado_en, id)`;
sin activas, o con el vehículo en la papelera o inexistente, no hay fila. De ahí: la primera nace aprobada, las siguientes (y las de «encima») no;
invalidar o mandar a la papelera la aprobada la reasigna; **restaurar o reactivar no le quita la marca a quien la tiene**; una aprobación a mano no
vuelve al restaurar un vehículo. Cambiar de vehículo (también desde el detalle de una preventa guardada, por `cotizacion_guardar`) sale del viejo (si era
la aprobada, la releva la más antigua de ese) y llega al nuevo sin marca, salvo que no tuviera. Sin vehículo nunca es aprobada. Guardar la aprobada refresca su monto; guardar otra no lo toca. Marcar o crear una final no
aprueba: si la aprobada se va con las preventas, la releva la más antigua activa que queda.

**Quién la mantiene:** toda escritura de `cotizaciones` que pueda cambiarla (alta, vehículo, estado, papelera, `totales`, `lead_id`, `creado_por`,
`origen_id`, borrado) sin reescribir ninguna RPC. `trg_cotizacion_aprobada_anotar` (por fila, sin candados ni escrituras) anota en un GUC local los
vehículos tocados y `trg_cotizaciones_aprobadas_al_confirmar` (constraint trigger **diferido**) toma, **al confirmar**, el candado de cada vehículo en
orden de id y los repone con una lectura nueva. Por eso una RPC de escritura no devuelve si quedó aprobada: la pantalla lo lee después. La siembra de
volumen inserta sin triggers y llama `_cotizaciones_aprobadas_rellenar()`.

**`cotizacion_aprobar(id, versión esperada)`** pasa a la cotización a aprobada y la anterior deja de serlo. En este orden: ver (42501 «No tienes
acceso a esta cotización.», igual para inexistente o en la papelera) y `cotizaciones.aprobar` **del origen de la cotización** (42501), todo antes de
tomar nada; sin vehículo, 22023 con `hint 'vehiculo'`; inválida, 23514. Candados: el vehículo `for key share`, la cotización `for share` y, al final, el
candado de la aprobada del vehículo (aviso). Con todo tomado vuelve a mirar ver y exige la versión **de esa cotización** (PT409 con quién y cuándo) sin
moverla. Aprobar la que ya lo es no cambia nada. Deja `cotizacion.aprobada` en la actividad y devuelve `{cotizacion, anterior}`; `anterior` sólo viaja
si quien aprueba la ve, puede aprobarla (su origen) y sigue activa (es lo que necesita «Deshacer»).

**Dónde se aprueba otra:** «Aprobar» de la cabecera de la guardada, «Aprobar» del «⋯» del listado, «Aprobar esta» del bloque **De este vehículo**
(la guardada y el resumen del listado) y «Aprobar esta» al pie de cada columna de **Comparar cotizaciones** (`/cotizaciones/comparar`: lo guardado de
2 o 3 del mismo vehículo, cada una con `cotizacion_hoja_guardada()` y sin `cotizacion_evaluar`, alineado por nodo en TS con el diseño y los valores ya
recortados; nada se lee de `formulas`). El bloque lee `cotizaciones_de_este_vehiculo(vehículo, tamaño, cursor)` (invocadora: una página por
`cotizaciones_vehiculo_creado_idx` y, sin cursor, la aprobada por `cotizaciones_aprobadas_pkey` marcada `fijada`), que trae la versión de cada fila para
aprobarla y el nombre de su modo de tipo de cambio por `_nombre_del_modo()` (`security definer`: el nombre que ya dan la hoja y la tarjeta a quien
tiene `cotizaciones.ver` del origen, una vez por versión y modo).

Candados de la clase (todos en el orden común lead → vehículo → cotización → aprobada): la transacción que confirma ya tiene sus candados de fila y
sólo lee `cotizaciones` y escribe `cotizaciones_aprobadas` tras el candado de aviso, así que no cierra ciclos. `cotizaciones_aprobadas.vehiculo_id`
**no tiene FK a `vehiculos`**: el `insert` tomaría `key share` del vehículo al confirmar y cerraría un ciclo con su papelera. Pruebas:
`supabase/tests/areas/aprobada/`, `scripts/carreras/cotizaciones-aprobada.mjs`, `supabase/tests/medir-cotizaciones-aprobadas.sql`.

## Niveles de acceso (D7, H3 y H4)

- **Un nivel** es una fila de `cotizaciones_niveles` (sembrada con «todos» y «costos»). Cada uno, salvo «todos», genera dos permisos por
  origen, `cotizaciones.nivel.<clave>.ver` y `….editar`, en la matriz de Roles. «Todos» usa `cotizaciones.ver` y
  `cotizaciones.crear`/`cotizaciones.editar`. Al publicar, el diseño se compila a `formulas.visibilidad`, lo único que lee la base.
- **Lo que no se ve no viaja** («En la base», abajo): la tarjeta y el PDF leen lo que dibujan con `cotizacion_tarjeta` (sólo lo del nivel
  «todos», «La lectura de la tarjeta») y los montos con `cotizacion_leer`, y `validar_plantilla` rechaza un nodo que no sea del
  nivel «todos». El primer resultado de la aprobada (`totales.usd`) viaja a todo el que ve la cotización: es lo que la tarjeta del total dibuja a «todos». Un inventario (`cotizaciones-visibilidad.sql`) registra toda función que pueda devolver esas columnas o `formulas.*`.
- **Límite:** un nodo restringido, único oculto de una suma visible, se deduce restando; el editor del diseño lo avisa.
- **Pantalla:** la matriz de Roles, bloque «Cotizaciones» (`/configuracion/roles?bloque=cotizaciones`; `docs/UX.md`). `niveles_con_uso()` devuelve `{tope, niveles}` con
  banderas `se_renombra`, `se_retira`, `se_elimina` y `motivo_de_uso`: la UI no razona por nombre ni clave. En TS los permisos de un
  nivel se reconocen por su forma (`esClaveDeNivel()`), no están en `CLAVES_PERMISO`.

### En la base

- **La tabla** `cotizaciones_niveles (id, clave, nombre, retirado_en, …)`. La clave sale del nombre y no cambia; **no se desambigua**
  (clave existente, viva o retirada: 23505). **Tope: 10 niveles** con «todos» y los retirados. Se escribe sólo por RPC.
- **Los permisos** `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`, `por_origen`, `aplicado_en` = `_nodos_visibles`)
  nacen con el nivel, concedidos al rol `dueno`; los ata un check (`permisos_nivel_check`), una FK `on delete restrict` y un trigger
  diferido (`trg_nivel_con_permisos`).
- **RPC** (`equipo.roles.gestionar`; `search_path` vacío): `nivel_crear(p_id, p_nombre)` (idempotente por id), `nivel_renombrar`,
  `nivel_retirar` (deja de ofrecerse; permisos y usos siguen), `nivel_restaurar`, `nivel_eliminar` (`for update` **antes** de mirar el
  uso; con uso, 23503 `nivel_en_uso`); los de cambio llevan `p_actualizado_en_esperado`. Publicar toma `for key share` los niveles del
  diseño. **Invariante:** ninguna versión publicada o archivada nombra un nivel que no existe.
- **`_nodos_visibles(formula_id)`** → `(nodo, editar)` (de nadie): **un nivel sólo estrecha.** Se ve un nodo de `ver: todos` con
  `cotizaciones.ver` del origen, y uno de `ver: X` con `cotizaciones.ver` **y** `cotizaciones.nivel.X.ver`; se edita lo que se ve con
  `cotizaciones.crear`/`cotizaciones.editar` y, si `editar` no es «todos», `cotizaciones.nivel.Y.editar` (`editar` nulo no se edita).
  Lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`, sin editar. Usa los permisos **reales** (`mis_permisos()`):
  «Ver como» no cambia lo que decide la base.

### En la base

La lectura de una cotización: lo que quien llama no ve no viaja (`supabase/tests/cotizaciones-visibilidad.sql`).

- **Ninguna lectura directa del snapshot:** `authenticated` y `anon` no leen `cotizaciones.valores|fuentes|totales|tipos_cambio` ni
  `cotizaciones_revisiones.diff` (grant de columnas; una columna nueva nace sin grant); `total_base`, `modo_tc`, `ver_total_bs`,
  `titulo`… sí. `cotizacion_auditar()` quita esas columnas de `actividad`.
- **El recorte** (`_cotizacion_contexto`, `_cotizacion_recorte`): `valores`, `estados`, `fuentes`: los nodos de `_nodos_visibles` y
  siempre el total y lo `aparte`. `totales`: `bs`, `usd`, `suma_usd` siempre; un grupo sólo si se ven **todos** sus nodos, y su `bs` sólo
  si ningún tipo de cambio de la fórmula está restringido por un nivel que quien lee no tiene. `tipos_cambio`: todos salvo los de un
  nodo restringido. `faltantes`: los de nodos visibles, `total` o un grupo que viaja; los demás sólo marcan `hay_faltantes_ocultos`.
- **`cotizacion_leer(id)`**: `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente, en la papelera o no vista dan el mismo 42501),
  `_nodos_visibles` de SU versión y el recorte.
- **`cotizacion_evaluar`** devuelve lo recortado y **no es un oráculo:** un `input` o `bandera` oculta da el mismo error que uno
  inexistente; un override de un nodo oculto vuelve como `nodo_inexistente`. Quien no configura el origen sólo elige uno de los
  `cabecera.modos` de esa versión.
- **`cotizacion_revisiones(cotización, antes?, tamaño?, hasta?)`:** página por cursor; `hasta` (instante exclusivo) la empieza en la más
  nueva con `creado_en < hasta` (`cotizaciones_revisiones_cotizacion_creado_idx`; sin ninguna, vacía; la guarda va primero). Cada `diff`
  va recortado, cada fila con su `autor` (`{id, nombre}`) y la página con las `etiquetas` de los nodos y grupos que nombran sus diffs ya
  recortados, más `calculos` (id → formato) de los cálculos entre ellos: con él, `cambiosDeLaRevision()` dice «Pisó «X»: $480 → $500»
  (la fuente pasa a `override`) o «Volvió al calculado «X»» (deja de serlo), con los montos de `diff.valores`.
- **`formula_para_cotizar(origen)`** y la lectura de `formulas`: sólo con `cotizaciones.configurar`.
- **`cotizacion_tabla(clave, cotización | origen, abierta?)`:** sólo las columnas que leen los nodos que quien llama ve, de SU versión: la
  de la cotización, la de la hoja abierta o la publicada.

### Quién escribe una cotización y cómo

**Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` con `insert`, `update` o `delete`:** `authenticated`, `anon` y PUBLIC no
tienen privilegio de escritura y no hay policies de crear ni editar. Escriben, con `security definer`: `cotizacion_crear()`,
`cotizacion_guardar()`, `cotizacion_encima()`, `cotizacion_marcar_final()`, `cotizacion_moderar()`, la papelera y los triggers
`cotizacion_revision()` (la única escritura de `cotizaciones_revisiones`), `cotizacion_contadores()` y `cotizacion_auditar()`. `cotizacion_aprobar()` no escribe `cotizaciones`: escribe `cotizaciones_aprobadas`
(«La cotización aprobada»).

**`cotizacion_crear(id, origen, lead, entradas, abierta, vehículo?, vehículo_nuevo?, modo_tc?, clase = 'preventa', con_la_abierta =
false, ver_total_bs = false, titulo = null, titulo_manual = false)`** calcula en la base sobre la fórmula publicada del origen y devuelve `{cotizacion, valores, fuentes,
totales, tipos_cambio, repetido}`, recortado por `_cotizacion_respuesta()` (el recorte de `cotizacion_leer()`). En este orden:

1. `cotizaciones.crear` y `cotizaciones.ver` **del origen de la cotización** antes de mirar nada; con una final, además
   `cotizaciones.final.gestionar`.
2. **El intento** (`p_id`, lo manda el cliente): un candado consultivo por id ordena dos llamadas a la vez; si el id existe y es **mío,
   de este origen y de una cotización viva**, se devuelve con `repetido: true`; un id ajeno no se mira (42501 en el `insert`, para no
   servir de sonda). Después se lee la hoja abierta («La hoja abierta»).
3. **El lead es obligatorio** (22023 `lead`, el primero que se mira) salvo con `cotizaciones.crear.sin_lead` de ese origen, y nunca en una final; con uno, tiene que verlo quien llama (`leads.ver`); se bloquea con `for key share`. Una final pide además el lead en
   la cartera con `leads.editar` y lo toma `for no key update`.
4. **El vehículo:** obligatorio (22023 `vehiculo`) salvo con `cotizaciones.crear.sin_vehiculo` de ese origen, y siempre en una final.
   `p_vehiculo_nuevo` llama a `vehiculo_crear()` en la misma transacción (la pantalla no lo usa: «Cargar a mano» crea el vehículo antes).
   Uno que quien llama no ve: 42501.
   4b. **El título** (después del lead y del vehículo): manual si `p_titulo` trae texto (`btrim`) y `p_titulo_manual` lo pide —sin vehículo no hay
   automático, así que el texto que llega es manual—; más de 120 puntos de código, 22023 `detail titulo_largo` `hint titulo`. Si no, el
   **automático**: el título del vehículo, `nullif(btrim(left(btrim(titulo), 120)), '')`. Sin vehículo y sin título, 22023 `hint titulo`
   («Escribe el título de la cotización.»).
5. **La fórmula** publicada, `for share` (publicar espera a las altas en curso; si publicaron, se relee: tres vueltas y PT409).
6. **El modo** (`p_modo_tc`): nulo o la `clave` de un modo de esa versión (`modo_invalido`). Y **«Ver total Bs»** (`p_ver_total_bs`):
   `_cotizacion_ver_total_bs()` rechaza (22023) un nulo (`ver_total_bs_falta`) y un verdadero que `diseno.cabecera.ver_total_bs` de la
   versión que se usa no ofrece (`ver_total_bs_no_ofrecido`); con «Guardar con la N» vale la versión abierta.
7. **Lo tipeado**, con `_cotizacion_tipeado()` (de nadie; el mismo chequeo que el motor, compartido por evaluar, crear y guardar): un
   valor para un nodo que se ve y no se edita → 42501 `nodo_no_editable`; un override de un nodo oculto o inexistente →
   `nodo_inexistente`; sin variante y sin `por_defecto`, `variante_sin_eleccion`.
8. **El cálculo.** Un override que el motor descarta en un nodo visible se rechaza (22023). Se guardan `valores` y `fuentes`
   **enteros** (los nodos que quien llama no ve, y los que no mandó, con el valor de la fórmula), `totales`, `modo_tc` y `tipos_cambio`
   (las tarifas de la empresa que usó). **`total_base` es el total en la moneda base de la empresa** (`USD` o `BOB`, otra → 22023; sin
   valor, `total_sin_valor`; si no cabe en `numeric(18,2)`, `fuera_de_rango`).
9. **El `insert`:** el índice único `cotizaciones_final_por_vehiculo` da 23505. Una final: «Crear una final».

Candados: intento, lead, vehículo, fórmula; una final, además el lead `for no key update` y, después del cálculo, las vivas del vehículo.
«Desactualizada» vive en `cotizacion_crear()`: «Cómo se guarda».

### Cómo se guarda

**`cotizacion_guardar(id, intento, actualizado_en_esperado, entradas, modo_tc, titulo, notas, vehículo, ver_total_bs, titulo_manual = null)`** es la única
edición: calcula en la base con SU versión de la fórmula (nunca la publicada de hoy) y SUS tipos de cambio congelados, conserva lo que
quien guarda no ve ni edita, y devuelve lo mismo que crear. Recibe el **estado entero de lo que la persona edita** (`modo_tc`, `titulo`,
`notas`, `vehículo` y `ver_total_bs` sin valor por omisión: nulo es un valor, salvo en `ver_total_bs`, donde nulo es
`ver_total_bs_falta`; el vehículo es el de la hoja: el guardado o el elegido en una preventa); lo que no manda en `entradas` queda sin tipear (↺). Se edita `modo_tc` (clave de un modo de SU versión, o nulo),
`ver_total_bs` (verdadero sólo si el diseño de SU versión lo ofrece; también en una final), `titulo` y `titulo_manual` (manual si `titulo` trae
texto y `titulo_manual` no es falso —nulo es «manual si trae texto»; sin vehículo el texto es manual—, hasta 120:
`titulo_largo`; si no, el del vehículo que queda, rehecho en cada guardado; sin vehículo y sin título, 22023 `hint titulo`; `titulo_manual` entra
en la huella del intento y en «nada cambió»), `notas` (hasta 2.000) y
`vehiculo_id` (poner o **cambiar**, no se quita; **una final no lo cambia**). No se editan `tipos_cambio` (se congelan al crear), `clase`,
`lead_id`, `plantilla_id` ni `moneda_mostrar`.

**En este orden** (cada error igual para lo que no existe y para lo que no se ve): (1) **permiso** (`_cotizacion_puede_guardar()`, antes
y después del candado): una preventa pide `cotizaciones.ver` **y** `cotizaciones.editar` (`puede_cotizacion`, por su alcance); una
**final**, `cotizaciones.ver` y `cotizaciones.final.gestionar` del origen; inexistente, en la papelera o no vista: 42501, antes del
vehículo, del candado, del intento y de la versión; (2) candados, **intento**, **versión** y validación de título, notas, vehículo y modo;
(3) **armar con SU versión** (`_cotizacion_armar`), `_cotizacion_tipeado()` y `_cotizacion_conservar()`; (4) `evaluar_formula()` y
`_cotizacion_guardable()`: un override **mandado** que el motor descarta, o un total sin valor o que no cabe, se rechaza (22023); (5) si
nada cambió, no escribe.

**Lo que se conserva y lo que se recalcula (D7).** Lo que quien llama no edita (nodo que no ve, o ve y no edita) se **reconstruye de
`valores` y `fuentes`** guardados (`_cotizacion_entradas_de()`) antes del motor: lo oculto se conserva byte a byte; un valor mandado
para un nodo que se ve y no se edita, distinto de lo guardado, es 42501 `nodo_no_editable`. Lo derivado (fuente `sugerido`/`default`,
el `pct` pisado, nodos apagados) se recalcula: **límite aceptado**, lo oculto que se deriva de lo visible cambia con lo visible.

**El intento.** `p_intento` es un uuid que genera el cliente por cada guardado; vive en la revisión (`cotizaciones_revisiones.intento`
con la `huella`). Repetirlo, de la misma persona y con los mismos datos, devuelve lo guardado con `repetido: true` y **no cae en
PT409**; el mismo intento con otros datos u otra persona es 22023 `intento_reusado`. **Ni `intento` ni `huella` se leen.**

**La versión.** `cotizaciones.actualizado_en` la sella `cotizacion_version()` y **no se mueve con los contadores de favoritos y
reportes**. Vieja: `_conflicto_de_edicion()` (PT409 diciendo quién y cuándo). La revisión (`cotizacion_revision()`) guarda **sólo los
nodos que cambiaron** (`{de, a}`) en `valores` y `fuentes`, y en `totales` **sólo las claves que cambiaron**, con cada grupo de `grupos`
entero si cambió. Al leerla, `_cotizacion_diff_recortado()` recorta los dos lados y saca el grupo que quedó igual y un `grupos` vacío: un
grupo visible cuyo único cambio es su Bs oculto, o un grupo oculto que se movió, no se delata.

**«Desactualizada», en el alta.** Aplica a guardar una cotización **nueva** (editar una vieja no avisa): vive en `cotizacion_crear()`,
que recibe la hoja abierta (`p_abierta`). Si la versión publicada de hoy (la de la fórmula activa) es otra (se compara **por id**) o una tarifa que la fórmula
nombra cambió (`tipos_cambio_historial`): **PT409, `detail desactualizada`, `hint formula` o `tipo_cambio`**, sin guardar. **«Guardar con
la N»** es `p_con_la_abierta := true`: se crea con la versión de la apertura y las tarifas de entonces, sólo si la hoja se abrió hace menos
de 24 h y, si esa versión ya no es la publicada, dejó de serlo hace menos de 24 h (por una versión posterior de su fórmula o porque su fórmula
dejó de ser la activa, `desactivada_en`: lo primero que pasó). El intento repetido vuelve antes.

**Candados.** Guardar toma **el vehículo actual y el nuevo (sólo si cambia), `for key share`, en orden de id, y después la cotización
`for no key update`**; ni el lead ni la fórmula (`formulas` es append-only).

### La lectura que abre la hoja

**`cotizacion_hoja(origen)`** es UNA lectura al abrir la pantalla de cotizar: el diseño publicado de la fórmula activa **recortado al nivel de quien mira** y
lo que la hoja necesita para dibujarse. No lee `cotizaciones` ni el snapshot. **Orden:** el permiso **antes de mirar nada** (`cotizaciones.crear`
y `cotizaciones.ver` del origen); sin versión publicada, `{estado: 'sin_publicar', origen, puede_configurar}`; con ella, `{estado: 'lista',
formula: {id, version}, abierta_en, abierta, cabecera, secciones, tarjeta_total, tonos}`. La `cabecera` es `{modos,
ver_total_bs, moneda_bs, ajustes}` más su aspecto y, sólo si el diseño las trae, `modo_por_defecto`, `ver_total_bs_por_defecto` y
`modos_visibles` (las copia tal cual: la hoja calcula lo efectivo). La pieza `total` viaja a todos en su sección y su lugar
(`{tipo: 'total', nodo, etiqueta, formato}` con su aspecto: el nodo de `tarjeta_total`), salvo con una variante en par; sin ella, como siempre.

- **`cabecera.ajustes` (el ⚙ de la cabecera):** `cotizaciones.configurar` del origen **y** al menos un modo. La base decide quién lo ve,
  como el `ajustes` de cada celda; la hoja no mira permisos. Una cotización nueva abre con el modo por defecto (`modoInicial()`: el modo por
  defecto o el primero) y con «Ver total» por defecto si la hoja lo ofrece (`verTotalBsAlAbrir()`); una guardada, con lo suyo. El
  encabezado dibuja los modos visibles más el elegido (`modosDelEncabezado()`).

- **`cabecera.moneda_bs`:** la `moneda_a` del tipo de cambio **activo** que nombra el `total_en` de esa versión (una fila por
  `tipos_cambio_clave_key`); JSON `null`, con la clave presente, si la versión no tiene `total_en` o ese tipo de cambio no existe o está
  inactivo. Viaja a todos, sin recorte por nivel (el total en Bs ya viaja siempre y `authenticated` lee `tipos_cambio`), nunca con el id ni
  la clave del nodo o del tipo de cambio. **Nula no quiere decir sin Bs:** el motor calcula el Bs con el tipo de cambio de cada bucket y
  usa `total_en` sólo para sacar los dólares (`oficina` no tiene `total_en` y su `totales.bs` tiene valor); con ella nula la hoja no dibuja
  «Ver total Bs» y guarda `ver_total_bs` en falso.
- Un ítem viaja si su nodo es visible (su `pct`, en un par); una sección, si le queda algún ítem. **Nunca viaja:** `de`, `texto`,
  `match` (salvo `dato_del_vehiculo`), `sobre`, `sugerido_de`, `descripcion`, los grupos, ni los `buckets` y `total_en` de un modo.
- **`dato_del_vehiculo`:** la celda de un nodo `tabla` que se ve lleva `{tabla, columnas: [{columna, campo}]}` —qué columna de su tabla
  casa con qué dato del vehículo— si alguna entrada de su `match` lo nombra; si no, no trae la clave. Cuenta una entrada cuyo valor **no es
  el id de ningún nodo** (aunque coincida con la clave de un campo: el motor lee el nodo) y es `anio`, `marca`, `modelo`, `kilometraje`,
  `precio` o un campo **activo** del origen de la hoja; un `campo_vehiculo` no cuenta. La tabla, congelada en la versión o viva y activa (la
  regla de la ayuda). `columnas` va por `columna` con `collate "C"`. Lo arma `_hoja_datos_del_vehiculo()` (invoker, de nadie) una vez por
  lectura. **El contrato son las filas:** `cotizacion_tabla()` con la hoja abierta las da con su `columna`; `columnas` puede venir vacío
  (congelada sin viva activa) y `filas` también (tabla vacía: el motor da `tabla_sin_filas` y la pantalla lo dice).
- **Una celda** lleva `nodo`, `etiqueta`, `tipo_nodo`, `formato`, `ancho`, `tono`, `editable`, `motivo`, `ajustes`, `ayuda`,
  `dato_del_vehiculo`, `solo_en` y `condicion`/`requerido_si` **sólo si su bandera se ve**. **`editable`:** `editar` de `_nodos_visibles()`
  **y** que el nodo acepte un valor. **`ayuda`:** sus bloques (una `{texto, enlaces?}` o `{tabla}`, ya leída como bloques); título, texto y enlaces tal cual. Un bloque
  de tabla viaja si la tabla existe (congelada en la versión o viva) y quien mira la lee —configura el origen, algún nodo que ve la lee o el
  bloque nombra sus columnas—, con sus `columnas` (una que llena un nodo que no se ve no llena nada), `resaltar`, `casa` (sólo con `resaltar`:
  cómo casa una fila con la hoja, del `match` del primer nodo `tabla` que se ve y la lee; si una entrada no se resuelve, no casa) e `id` (el de la
  tabla viva, sólo a `cotizaciones.configurar`: la edición desde la ayuda). Sin ningún bloque, `ayuda` es nula. Los enlaces viajan con su celda y la hoja vuelve a exigir `URL_DE_ENLACE` antes de dibujar un
  `href`. **`motivo`** (lo que no se edita): `se_calcula`, `del_vehiculo`, `nivel`
  (con el **nombre** del nivel que falta) o `no_se_edita`. **`ajustes` (⚙):** una constante con `cotizaciones.configurar` del origen, o un tipo de cambio con
  `empresa.tipos_cambio.gestionar`.
- **El modo por clave:** la hoja recibe los modos sin sus `buckets`; `cotizacion_evaluar(…, p_modo_tc)` acepta la clave de un modo de esa
  versión (`_cotizacion_modo()`; ajena: `modo_invalido`). `p_modo` (objeto) también lo acepta la base; la app no lo manda.

### La hoja abierta

`cotizacion_hoja()` devuelve `abierta`: `<fórmula>.<µs desde 1970>.<huella>.<HMAC-SHA256 en hex>`, que cubre la persona, el origen, la
versión, la hora de apertura y la **huella de las tarifas** (clave en Vault, `cotizacion:abierta`). Para la pantalla es un texto opaco que
devuelve en cada recálculo y guardado. Inválida (nula, mal formada, de otra persona u origen, firma mala): 22023 `abierta_invalida`, siempre
el mismo texto.

- **La huella de las tarifas** (`_cotizacion_huella_tarifas()`): `md5` de los tipos de cambio que nombra la versión (activos o no) con su
  valor a la hora de apertura según `tipos_cambio_historial`; uno sin valor a esa hora no entra. `cambiado_en` es la hora del comienzo de la
  transacción que cambió la tarifa: la huella es lo que la hoja vio, no lo que el historial dice después.
- **`cotizacion_crear`:** la lee después del intento. Si su versión no es la publicada: PT409 `desactualizada`, o con `p_con_la_abierta`
  la valida y la toma `for share`; con `p_con_la_abierta` el tope de 24 h corre **siempre**. Después de armar, si la huella de las tarifas
  de la apertura no es la firmada (un cambio confirmó después de abrir la hoja con un `cambiado_en` anterior): PT409 `desactualizada`
  (`tipo_cambio`), o con `p_con_la_abierta` 22023 `abierta_tarifas` (`hint abierta`: recargar).
- **`cotizacion_evaluar` (por origen):** calcula con **la versión y las tarifas de la abierta**. Si ya no se puede usar,
  `abierta_vencida` y la hoja pide «Recargar» (de otro origen, borrador o inexistente: `abierta_no_disponible`).
- **`cotizacion_tabla` (por origen):** la tabla de una ayuda sale de **la versión de la abierta** (su definición, su copia congelada y lo
  que deja ver; una que sólo nombra una ayuda, la viva: no tiene copia ni genera N+1); a las columnas que leen los nodos que quien mira ve
  suma las que muestra la ayuda de una celda que se ve (un bloque sin `columnas` no suma ninguna); los mismos errores que el recálculo y `llamada_invalida` con una cotización. La resuelve `_cotizacion_tabla_version()`
  (de nadie).
- **Cotizar pide `cotizaciones.crear` y `cotizaciones.ver` del origen** en `cotizacion_hoja`, `cotizacion_evaluar` y `cotizacion_tabla`
  por origen y en `cotizacion_crear`; `cotizacion_guardar` pide `cotizaciones.ver` y `cotizaciones.editar`.

### La hoja de una guardada y cotizar encima

`cotizacion_hoja_guardada(p_id)` abre una cotización guardada para quien **la ve** (lo que no existe, está en la papelera o no se ve: el
42501 de `cotizacion_leer`; antes, `assert_activo()`). Devuelve:

- la fila y el snapshot recortados (`_cotizacion_respuesta`, como `cotizacion_leer`) y el diseño de **SU versión** (`_cotizacion_hoja`,
  como la hoja nueva);
- `puede_guardar` = `_cotizacion_puede_guardar()`: sin él, **ninguna** celda es editable y el motivo no es un nivel (`no_se_edita`); con
  él, se edita lo que `_nodos_visibles()` deja, como en `cotizacion_guardar`. Quien sólo ve abre el diseño en sólo lectura;
- `publicada: {id, version}` (la de la fórmula activa de hoy del origen, o nula), `vence_el` y `vencida`: el día de `creado_en` en la zona de la empresa +
  `ajustes_empresa.vigencia_dias`, vencida si ese día ya pasó (por día, no por hora);
- `anterior: {id, numero, version}` si se ve; `encima`, la versión nueva viva: `{id, numero, version}` si se ve, `{"oculta": true}` si no;
- lo pisado de una guardada sale de `fuentes` (`override` sobre un cálculo con celda, `entradasDeLoGuardado()`), y su «Calculado» es lo que
  daría **hoy**, con las tablas y el vehículo de hoy (el primer recálculo, como `difiereAlAbrir()`); cotizar encima lo lleva como
  cualquier override, y si la celda no está en la N+1 se descarta `no_sobrescribible`;
- `puede_cotizar_encima`: `cotizaciones.crear` del origen, ve su lead (o no lleva y tiene `cotizaciones.crear.sin_lead`), ve su vehículo (o no lleva y tiene `cotizaciones.crear.sin_vehiculo`), sin versión nueva
  viva y con publicada.

`cotizacion_encima(p_id, p_anterior)` crea **en el acto** la versión nueva: otra cotización, preventa (también encima de una final), con
`cotizacion_padre_id` = la anterior, `version` + 1, su propio número, el lead y el vehículo de la anterior, quien llama como `creado_por`,
la publicada de la fórmula activa y las tarifas de hoy. La anterior no cambia. **Una viva por anterior** (`cotizaciones_encima_unica`, parcial: una en la
papelera no cuenta). Sin `p_abierta` (no sale de una hoja vista).

- **El orden y los errores:** `assert_activo`; ver la anterior (lo que no existe, está en la papelera o no se ve: el 42501 de
  `cotizacion_leer`, antes que todo lo demás); `cotizaciones.crear` y `ver` del origen; su lead (nulo sin `cotizaciones.crear.sin_lead` del origen: 22023 `lead`; no visible: 42501);
  el intento (el candado de `cotizacion_crear`: repetido devuelve la misma; mío con otra anterior: 22023 `intento_reusado`); el lead y el
  vehículo de la anterior `for key share` y después la anterior `for share` (lead → vehículo → cotización; si su lead o su vehículo cambió
  mientras esperaba, se vuelven a tomar), otra vez visible; ya tiene una nueva viva: PT409 `ya_tiene_encima` (el id en el hint sólo a quien
  la ve); el lead y el vehículo otra vez visibles (o 22023 `vehiculo` si no lleva y falta `cotizaciones.crear.sin_vehiculo`); la publicada `for share`; el total (22023
  `total_sin_valor`: no se crea).
- **Lo que se lleva** (`_cotizacion_lo_que_se_lleva`): lo tipeado de cada nodo que sigue en la versión de hoy con un tipo que lo acepta,
  **también lo que quien llama no ve** (se guarda y no se le devuelve); la variante sólo si es opción de hoy; el modo si sigue (si no, el
  primero de hoy); «Ver total Bs» si hoy se ofrece; título y notas.
- **`descartados`** (`_cotizacion_descartados`): cuántas entradas tipeadas de la anterior que quien llama **ve** no llegan (no siguen, no
  se aceptan, la variante, un override que el motor descarta). Lo oculto que se pierde no se cuenta.

**La pantalla, `/cotizaciones/[id]`.** La hoja calcula por su origen (la nueva) o por su cotización (`DeDondeCalcula`): la guardada manda
`p_entradas`, `p_cotizacion` y `p_modo_tc` (y `p_vehiculo` sólo con otro vehículo elegido, abajo), nunca `p_origen` ni `p_abierta`. Abre con lo guardado como sus entradas
(`entradasDeLoGuardado`, espejo de `_cotizacion_entradas_de`: lo tipeado y los overrides, sin el porcentaje de un par pisado) y con
**una** llamada a `cotizacion_hoja_guardada` y otra a `cotizacion_evaluar(p_cotizacion)`. El recálculo usa las tablas **vivas** y los datos
de hoy del vehículo: si no da lo guardado (valores o total, `difiereAlAbrir`), la pantalla lo avisa, muestra «Total guardado» con
`<Monto>` y «Guardar» la deja con lo de hoy. «Guardar» llama a `cotizacion_guardar` con la versión que vio quien edita (`actualizadoEn`
como el texto de la base, nunca por `Date`, que pierde los microsegundos), las entradas del recálculo al día, el título, las notas sin tocar y el
vehículo de la hoja; lo que la hoja no manda lo conserva la base. El PT409 dice quién y cuándo; «Recargar» vuelve a montar la hoja con
la lectura nueva y lo tipeado no vuelve sobre la versión de la otra persona.

**Cambiar el vehículo de una preventa guardada.** Quien la puede guardar (`puede_guardar`) elige otro vehículo en el panel de cotizar y lo elegido vive
en `?vehiculo=`. El servidor hace el primer cálculo con él: `cotizacion_evaluar(p_cotizacion, p_vehiculo)` usa los datos del vehículo nuevo
(`campo_vehiculo`, las tablas que casan por un dato del vehículo) con SU versión y SUS tipos de cambio, sin escribir; una final con otro vehículo es
`llamada_invalida` (`hint p_vehiculo`) y uno que no se ve, en la papelera o de otro origen se rechaza: la página calcula con el suyo y dice «No se
puede usar ese vehículo.». Elegir otro vuelve a montar la hoja (lo tipeado vuelve con el borrador); con otro vehículo no se dice «Lo de hoy no es lo
guardado» (no es cierto: cambió el vehículo), sólo «Total guardado» si el total es otro. Cambiar el vehículo es un cambio que guardar: `cotizacion_guardar(…,
p_vehiculo)` rehace el título automático con el nuevo (un manual se respeta), mueve `vehiculos.cotizado_en` y deja `diff.vehiculo_id = {de, a}`; la
revisión se dice «Cambió el vehículo: A → B» con los títulos **resueltos al leer** (por clave primaria de `vehiculos`, con la RLS de quien mira; lo que no
ve, o está en la papelera, es «un vehículo que no puedes ver»): nunca se copia un título a la revisión. Guardado, `?vehiculo=` sale de la URL sin ir al
servidor; «Recargar» lo suelta siempre (lo elegido no vuelve sobre otra versión).

### Marcar final

**`cotizacion_marcar_final(id)`** elige la final del vehículo (a lo sumo una activa, `cotizaciones_final_por_vehiculo`). En este orden:

1. **Sin candado:** la cotización viva y visible (si no, 42501 «No tienes acceso a esta cotización.», igual para inexistente o en la
   papelera), `cotizaciones.final.gestionar` del origen, el vehículo, el lead (vivo; en la papelera, 23514), el lead en la cartera con
   `leads.editar` (como vincular), y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo (si no, 42501 «Este
   vehículo tiene preventas que no puedes mandar…»).
2. **Candados:** el lead `for no key update`, el vehículo `for key share` y, en una sola pasada por id, la cotización y todas las vivas del
   vehículo. El vehículo se escribe recién con todo tomado. Es el orden de vincular (lead → vehículo) y de la papelera de vehículos
   (vehículo → cotizaciones), y convive con el trigger `trg_vehiculo_cotizado` de crear, encima y guardar.
3. **Si algo cambió mientras esperaba** (la fila ya no está viva, otro vehículo u otro lead), otra vuelta desde el paso 1; a la tercera,
   PT409. Con todo tomado vuelve a mirar el lead, ver, las demás y el vínculo, releído después de la pasada: un vehículo de otro lead da 23514.
4. **Los efectos** (`_final_aplicar`): la final anterior tomada baja a preventa, la cotización pasa a final, las preventas tomadas van a un
   lote de la papelera de quien marca, el vehículo sin lead queda con el de la cotización, el lead pasa al primer tipo activo de la clase
   cliente (por orden y nombre) si no era de esa clase, y la actividad `cotizacion.final`. Marcar otra vez no falla ni cambia nada.

Una final activa ancla el vehículo en la limpieza automática (`'cotizacion_final'`), su vínculo no cambia (`vehiculo_vincular`: 23514) y,
aun sin lead, el vehículo no va a la papelera (`_vehiculo_motivo_de_bloqueo`: 23514).

### Crear una final

`cotizacion_crear(…, p_clase := 'final')` deja el estado de marcarla. Sin candado mira la final sin vehículo (22023), el lead en la
cartera con `leads.editar`, que vea el vehículo y, en `_final_crear_mirar` (de nadie, sin candados), otra final activa (23505: se
rechaza, no se reemplaza como al marcar), las preventas que no puede mandar a la papelera (42501) y el vínculo de otro lead (23514). Toma
el lead `for no key update`, el vehículo `for key share`, la fórmula y, después del cálculo, las vivas del vehículo en una pasada por id;
con todo tomado vuelve a mirar la cartera y la ayudante (el vínculo, en una sentencia nueva). Inserta y aplica `_final_aplicar`. No hay
otra vuelta: lo que crear toma son sus parámetros. La preventa no cambia.

### Cotizaciones privadas

Una **cotización privada** (`cotizaciones.privada`, falsa al nacer) la ven sólo quien la creó y quien tiene `cotizaciones.privadas.ver` **del origen
de la cotización** (por origen, sin alcance; el dueño la tiene). Para el resto **no existe**: la regla va en la policy «cotizaciones: leer», en
`puede_cotizacion()` (y con ella en toda RPC, tabla hija o policy del bucket que pide ver una cotización) y en las copias de la policy de las funciones
definer (`_cotizaciones_ids_por_titulo`, el buscador, los relacionados, la actividad); una privada ajena no ocupa lugar en ninguna ventana ni tope. Las
lecturas invocadoras (el listado, la lista agrupada, la búsqueda, «De este vehículo») no cambian de rutas: la RLS la descarta sobre la fila que cada
ruta ya leyó. Quién ve qué, por rol y origen: `cotizaciones.ver` «propios» = las suyas y las de su cartera (sin las privadas de otros);
`cotizaciones.ver` «todos» = todas menos las privadas de otros; con `cotizaciones.privadas.ver`, todas. «Ver como» no cambia lo que decide la base.

**Quién la cambia:** sólo quien la creó. Al crearla (el interruptor «Privada» de la fila de los pasos de la hoja nueva), con `p_privada` de `cotizacion_crear()` y `cotizacion_crear_en_par()` (en el mismo `insert`:
crear y después marcar dejaría un momento en que se ve; una final privada, 22023 `hint privada`). Después, con
**`cotizacion_privada_cambiar(id, privada, versión esperada)`**: ver (42501, igual para inexistente o en la papelera), ser quien la creó (42501
«Sólo quien la creó la hace privada o pública.»), la marca no nula (22023 `hint privada`); candados en el orden común: el vehículo `for key share`,
ella y su hermana por id `for no key update` y, al hacerla privada, el de la aprobada del vehículo; con todo tomado vuelve a mirar ver y exige la
versión (PT409). Una final o la aprobada de su vehículo no se hacen privadas (23514, «Una final no se hace privada.» y «Es la aprobada de su vehículo: no
se hace privada.»). La versión, la revisión (`{privada: {de, a}}`) y la actividad las dejan los triggers de siempre. Devuelve `{resultado: cambiada |
sin_cambios, privada, actualizado_en}`.

**Lo que la hace pública:** aprobarla (`cotizacion_aprobar(…, p_hacerla_publica)`: sin pedirlo, 22023 `hint privada` «Al aprobarla deja de ser
privada.», para que una pantalla que no avisó abra el aviso; aprobar toma ella y su hermana `for no key update`) y marcarla final (`_final_aplicar`,
con su hermana antes de que vaya a la papelera). Una final nunca es privada (`cotizaciones_final_no_privada`) y la aprobada tampoco: `_aprobada_reponer()`
elige sólo entre las públicas (un vehículo con sólo privadas no tiene aprobada; hacer pública una la vuelve candidata). Las hermanas comparten la marca
(`trg_cotizaciones_hermanas`); cotizar encima la hereda (quien cotiza encima es el autor de la nueva). Una privada no mueve `vehiculos.cotizado_en`;
hacerla pública sí. En la papelera (la policy «leer» no la alcanza: exige `eliminado_en is null`) la regla va en `_cotizaciones_papelera_lote_json`,
`cotizaciones_papelera_listar`, `cotizaciones_papelera_lote` y `papelera_listar`: la privada ajena no se lista ni se cuenta, y un lote con sólo privadas ajenas
no aparece. Restaurar o purgar un lote lo hace entero, y lo que devuelven (`restaurados`, `purgados`, `bloqueados`) no la nombra. Pruebas:
`supabase/tests/areas/cotizaciones/privadas.sql`, L2 de `cotizaciones-visibilidad.sql`, el caso de `humo.sql` y A4 de
`scripts/carreras/cotizaciones-aprobada.mjs`.

## Cotizaciones hermanas (la variante en par)

Con una variante `en_par` (glosario: «Variante en par» y «Cotizaciones hermanas») la hoja cotiza las dos opciones a la vez y guardar crea dos cotizaciones, una por
opción, que se apuntan por `hermana_id`.

- **Qué nodos van en par** (`nodosEnPar()` de `entities/en-par.ts`, espejo de `_nodos_en_par()`, con el juego `casos-de-en-par.json`): regla estática, sin
  evaluar, en una pasada por el orden de la lista: un nodo va en par si tiene `solo_en` o si algo que nombra (`referenciasDe()`) es la variante o un nodo que ya va;
  la variante y los tipos de cambio nunca. La forma de la hoja no cambia al tipear.
- **La lectura** (`_cotizacion_hoja`): `par` (`{nodo, etiqueta, opciones: [{clave, etiqueta}, …]}`, a todo el que abre aunque su nivel esconda la variante: es
  configuración) y `en_par: true` en cada celda y subtotal que va en par; el ítem de la variante no viaja. La guardada suma `par.opcion` (la de esa cotización) y
  `hermana` (`{id, disponible, actualizado_en, puede_guardar}`; disponible si se ve, está viva y no es `invalida`; si no, sólo `{id, disponible: false}`).
- **Calcular**: `cotizacion_evaluar(…, p_opcion)` pone la opción de cada columna de la hoja nueva (la base, no la persona: un nivel que esconde la variante cotiza
  igual); una guardada calcula con la suya. Mandar `variante` en una versión en par es `variante_en_par`; `p_opcion` sin par, `sin_par`; una que no es del par,
  `opcion_invalida`; con `p_cotizacion`, `llamada_invalida`.
- **Crear** (`cotizacion_crear_en_par(p_ids, …, p_entradas[2], …)`): los dos ids del cliente como intento (candados en orden de id; dos mías, vivas y hermanas
  vuelven con `repetido`; una sola, `intento_reusado`); `cotizacion_crear` una vez por opción con el ajuste de la transacción `importadora.en_par` (la opción por
  su posición, la hermana y, la segunda, la hora de la primera + 1 µs: así la de la primera opción nace **aprobada** si el vehículo no tenía y quedan juntas en
  toda lista). «Desactualizada» y «Guardar con la N» fallan en la primera, para las dos. `cotizacion_crear` sobre una versión en par sin ese ajuste es
  `cotizar_en_par`.
- **Guardar** (`cotizacion_guardar_en_par(p_ids, p_intentos, p_actualizados_en_esperados, p_entradas[2], …, p_notas[2], …)`): permiso de las dos y que sean
  hermanas (`no_son_hermanas`) antes de los candados; los vehículos y después las dos cotizaciones en orden de id; `cotizacion_guardar` para cada una: si una
  cambió, PT409 con su id en el `hint` y no se guarda ninguna; la que no cambió no se reescribe (como siempre). Cambiar el vehículo cambia el de las dos. Guardar
  **suelta** una hermana (la otra no está disponible) no cambia el vehículo (`vehiculo_de_la_hermana`).
- **El título**: el cliente manda el título sin la opción y la base guarda «<título> · <etiqueta>» en toda versión en par (el manual tiene el tope
  `120 − largo(« · <etiqueta>»)`; el automático es el del vehículo cortado para que quepa).
- **El invariante** (`trg_cotizaciones_hermanas`, diferido): la hermana existe, apunta de vuelta y comparte lead, vehículo, origen y versión (23514). La versión
  y las revisiones no miran `hermana_id`.
- **Cotizar encima** (`cotizacion_encima_en_par`): el par nuevo en el acto, cada una encima de su hermana de antes y con la opción de su misma posición en el par de
  hoy (`puede_cotizar_encima_en_par`). Sin par hoy o sin la hermana, el `cotizacion_encima` de siempre.
- **La papelera**: enviar una manda su hermana viva al mismo lote (sin versión; si quien envía no puede, queda viva y va en `rechazados`); restaurar o purgar sólo
  algunas del lote suma su hermana del mismo lote. **Marcar final** una manda la otra a la papelera con las demás preventas del vehículo.
- **La pantalla**: la guardada de una hermana abre las dos juntas (`modoDeLaHermana()`: la hermana disponible y el mismo permiso de guardar) y guardar cualquiera
  guarda las dos; si no, sola con «La de <etiqueta> no está disponible.». La vista previa y el PDF llevan las dos tarjetas (una página A4 por tarjeta), y
  «Compartir», los conceptos y el total de cada opción y las dos imágenes de la tarjeta apiladas en una.

## Lo que se guarda en una cotización

`formula_id` (recalcular o editar usa **esa** versión, nunca la vigente); `valores` (`{nodo_id: número | null}` de TODOS los nodos; el
`opcion` guarda su clave; un nodo fuera de variante o apagado guarda 0); `fuentes` (`{nodo_id: default|sugerido|override|input}`);
`tipos_cambio` (`{clave: valor}` congelados); `totales` (por moneda y por grupo); `titulo` (el **título de la cotización**, hasta 120) y
`titulo_manual` (si lo escribió una persona; si no, es el del vehículo y la base lo rehace en cada guardado); `tarjeta_retoques` (los **retoques de la tarjeta**: textos y filas ocultas sólo de esta cotización; nula, la tarjeta tal
cual la plantilla; «Retoques de la tarjeta», abajo); `hermana_id` (la **cotización hermana** de una variante en par; nula si no tiene; purgar una la pone en
nulo en la otra sin mover su versión). **Nada se lee directo** (sale por `cotizacion_leer()`,
recortado por el nivel; `total_base`, `modo_tc`, `ver_total_bs`, `titulo`, `titulo_manual`, `tarjeta_retoques` y `hermana_id` sí son legibles) **ni se escribe directo**: se
crea con `cotizacion_crear()`, se edita con `cotizacion_guardar()` y se retoca con `cotizacion_retocar_tarjeta()`. **`calculados` (lo que
daría un cálculo pisado) no se guarda**: viaja sólo en la respuesta de `cotizacion_evaluar()`, recortado por el nivel.

## Binding con la XCell

Cada `input`, `constante`, `tipo_cambio`, nodo `sobrescribible` y cálculo que la hoja dibuja es una `XCell` (el par es una sola): `value` de `valores[id]`,
`suggested` de `fuentes[id] === 'sugerido'`, `overridden` de `'override'`, `disabledReason` si su `condicion` está apagada o es de otra
variante, y ⚙ (`hasSettings`/`onSettings(id)`) si es `constante` con `cotizaciones.configurar` del origen (→ `formula_cambiar_constante`)
o `tipo_cambio` con `empresa.tipos_cambio.gestionar` (→ `tipo_cambio_guardar`). El ⚙ cambia el default global (N+1); «Aplicar también a
esta cotización» es el único puente hacia la abierta. Toda la celda es el campo y su alto no cambia con el estado: un aviso, un error de
`faltantes` o un cálculo pisado no mueven la hoja.

La celda (`src/shared/ui/xcell/CLAUDE.md`) no valida rango, obligatorio ni entero (lo dice la base en `faltantes`), no decide permisos ni
abre nada: **la hoja traduce** (editar el % quita el override del monto; ↺ quita los dos) y pasa los mismos callbacks a todas las celdas.
El par de la celda es siempre el monto (principal) y su `pct` (secundario); `secundario.como` del diseño dice cuál se lee primero: con `porcentaje`,
«$181 14,94 %»; con `monto`, `secondaryProminent` y la celda dibuja el % primero y grande y el monto chico detrás («14,94 % $181»). Los ids que emite
cada lado no cambian.

Lo pisado sale de lo escrito, no de la respuesta (`ladoPisado()` de `entities/binding-pisado.ts`: el principal primero, y si no, un secundario
que es un cálculo): la celda recibe `handEdited`, `calculatedValue` y `calculatedFormat`, y ↺ dice «Volver al calculado»; una constante escrita
sigue con «Volver al valor por defecto». Con el monto escrito, el % de un par que `sigueAlMonto` es el de la respuesta, no uno tipeado antes.

Los «Decimales» de cada lado llegan con la hoja: `decimals` (el principal), `secondaryDecimals` (su %) y `calculatedDecimals` (los del lado pisado, para
«Calculado: …»). Sin ellos, la XCell muestra lo de siempre; con ellos, N fijos redondeados como la base (`texto-de-valor.tsx`). El subtotal, la tarjeta del
total (y su Bs, con los del total), lo pisado del resumen (`pisadasDeLaHoja()`) y el par usan los del nodo que muestran.

En `/cotizaciones/[id]` se dibujan además «Revisiones» (`cotizacion_revisiones`, de a 20 por cursor), la cadena (`anterior`, `encima`) y
«Cotizar encima» (`cotizacion_encima`, con un intento que sólo se conserva tras una pérdida); el botón sale con `puede_cotizar_encima`, no
con `puede()`, y con cambios sin guardar espera, porque la nueva lleva lo guardado.

### La hoja dibujada y el recálculo

`/cotizaciones/nuevo?origen=&lead=&vehiculo=`. **Una lectura y un cálculo al abrir, en el servidor, en serie** (`cotizacion_hoja` y
después `cotizacion_evaluar` con entradas vacías y su hoja abierta); el navegador no pide nada al abrir. Después, **un pedido por pausa,
desde el navegador** (`infra/recalculo.client.ts`). Tope de nodos del DOM de la hoja más grande: **460** (`docs/RENDIMIENTO.md`).

- **La cola (`useRecalculo()`):** cada confirmación (la `XCell` no emite por tecla) reinicia una espera de 150 ms; al vencer sale UN
  pedido; con uno en vuelo queda uno pendiente con lo más nuevo. La respuesta sólo se aplica si nadie confirmó nada después. Una regla
  rota (22023, `abierta_vencida`), la sesión vencida o un permiso que se fue piden «Recargar», no «Reintentar». **El mensaje de la base
  nunca llega a la pantalla.**
- **Props (`entities/binding.ts`):** `value` es lo tipeado y pendiente, si no `valores[id]` de la última respuesta; `disabledReason`
  sale primero de los `estados` del recálculo y después del `motivo` de la lectura. **Entradas (`entities/entradas.ts`):** un `input`
  va a `inputs`; constante, tipo de cambio o cálculo (sobrescribible o con celda), a `overrides`; **el porcentaje de un par quita el override del monto**.
- **Lo que se dibuja de una celda apagada sale de `estados` del recálculo, nunca de la lectura** (que quita `condicion` y
  `requerido_si` si su bandera no se ve): quien no ve la bandera no puede mandarla, así que la celda vuelve `condicion_apagada` con 0 y
  la hoja dice «Está apagada en esta hoja.» sin nombrar nada ni esconderla.

### Guardar desde la hoja

`Ctrl/Cmd+S` o «Guardar» → Server Action `crear-cotizacion.ts` → `cotizacion_crear`; siempre preventa, con **la misma hoja abierta que
el recálculo**. **El intento:** un uuid por guardado, pendiente en la pestaña; se suelta con toda respuesta con SQLSTATE y se conserva sin
red o con respuesta ilegible. Con el total nulo, «Guardar» se apaga con su motivo. **Rechazos:** se leen de código, `details` y `hint`
(`entities/guardado.ts`) con textos propios, nunca el mensaje de la base; «desactualizada» va en línea («Guardar con la versión N»
reenvía con `p_con_la_abierta`). **Dónde:** «Guardar» va a todo el ancho debajo de «Avanzado» (el cierre de la hoja), con su motivo, lo que
falta elegir y, en una región viva, lo que dijo el último guardado; en una guardada sube a la cabecera y el cierre queda con la región viva.

## Comprobantes

Un comprobante se emite sobre una final activa con `comprobante_emitir(cotización, versión)` y se anula con
`comprobante_anular(id, motivo)`; la serie vigente la cambia `comprobantes_serie_cambiar(serie, versión)` en Empresa. La serie y `datos`
los pone la base: `datos` congela el recorte del nivel «todos» (el de quien sólo tiene `cotizaciones.ver`, con `_cotizacion_contexto` y
`_cotizacion_recorte`), las etiquetas de esos nodos y, del cliente y del vehículo, sólo los ids. Los candados van vehículo → cotización →
serie vigente → contador, y la numeración no tiene huecos (un contador por serie, nunca una sequence). Un vigente por cotización; una
cotización con comprobante no va a la papelera ni la baja marcar otra final. Errores y pruebas:
`src/modules/cotizaciones/areas/comprobantes/CLAUDE.md`.

## Plantilla de tarjeta (PDF)

La tarjeta de la cotización (la vista previa tipo Excel, el PDF y la imagen) se describe como una **cuadrícula libre** y **un solo
modelo** la dibuja (`geometriaDeLaTarjeta()`). Sólo nodos del nivel «todos». PDF en servidor con `@react-pdf/renderer`; imagen con `next/og`.

**Dos formas de `plantillas_tarjeta.definicion`.** Con la clave `forma` en la raíz es la **forma 2** (la cuadrícula); sin ella, la **forma 1** (la de
grupos), que se convierte a la cuadrícula al leerla y no se migra. El editor escribe sólo la forma 2; una forma 1 guardada (borrador o publicada) se
convierte al abrirla y se guarda convertida cuando quien edita guarda. Las semillas de USA siembran la forma 2 (con la comisión del giro y su porcentaje
como texto con datos; su forma 1, para las pruebas de la conversión, en `entities/plantilla/plantillas-v1-de-las-semillas.json`); la de oficina, la forma 1.

**La forma 2**, estricta (`entities/cuadricula-de-la-tarjeta.ts`): `{forma: 2, columnas: [{id, ancho}], filas: [{id, alto, ocultar_si, nodo?}],
celdas: [{id, fila, columna, abarca_columnas?, abarca_filas?, contenido, estilo?}]}`. Columnas de 24 a 640 px (hasta 16, **ancho total ≤ 1.600**);
filas de 16 a 240 px (hasta 120) con `ocultar_si` `nunca` | `no_aplica` | `no_aplica_o_cero`, referido al `nodo` de la fila (obligatorio con esas dos
y ausente con las otras), o `condiciones`, con su `si` (de 1 a 3 condiciones unidas con Y: la fila no se dibuja si se cumplen todas); hasta 1.000 celdas, con combinaciones de 1 a 16 columnas y 1 a 120 filas; ids con la forma de un id y únicos; una
posición sin celda es una celda vacía sin estilo. **Contenido:** `{tipo: 'texto', texto}` (0 a 300 caracteres, sin `{{`: nada interpola),
`{tipo: 'texto', partes}` (el **texto con datos**: de 1 a 20 partes, cada una un texto literal —un string no vacío, sin `{{` y nunca junto a otro— o un dato
como el de `{tipo: 'dato'}`; al menos un dato y hasta 300 caracteres sumando los textos; `texto` y `partes` juntos son una clave de más; se dibuja con el mismo
formato que «Dato», un dato sin valor no escribe nada —ni «—»— y un monto adentro va con `<Monto>` en el HTML), `{tipo: 'dato', variable}` (`empresa_nombre` —el nombre de la empresa de sus ajustes—, `fecha_larga`, `numero`, `titulo` —el título de la cotización sin el de respaldo «Cotización n.º N»,
`tituloAparteDelNumero()`; en la hoja nueva, el que se está escribiendo—, `titulo_opcion`, `asesor_nombre`, `asesor_iniciales`, `cliente_nombre`,
`vehiculo_titulo`, `vehiculo_lote`, `vehiculo_vin`, `vence_el`, `modo_tc`, `asesor_telefono` —el WhatsApp del asesor tal como lo guardó en su perfil—,
`asesor_cargo`), `{tipo: 'dato', nodo, mostrar}` (`monto`, `etiqueta`, `descripcion`,
`porcentaje` —de un nodo de un par: el `porcentaje_de` o su `pct`—, `tc_nombre`, `tc_valor` y `plazo` —del grupo del nodo—), `{tipo: 'logo'}` (sólo el
logo de la empresa, sin el nombre, entero en la celda menos su relleno y alineado por `alinear` y `alinear_vertical`, en el HTML, el PDF y la imagen),
`{tipo: 'foto_del_asesor'}` (la foto de perfil del asesor, ubicada como el logo; sin foto, o si no carga, sus iniciales en un círculo del lado menor de la
caja, con borde de 1,5 px y letra de 0,4 × el diámetro en el color del texto de la celda: `circuloDeLasIniciales()`), `{tipo: 'vacio'}`,
`{tipo: 'respaldo', datos}` (la **lista de respaldo**: de 2 a 5 datos, variables o nodos con qué mostrar, en orden; se muestra el primero con valor) o
`{tipo: 'condiciones', ramas, si_no}` (las **condiciones de la tarjeta**: de 1 a 4 ramas `{si, contenido}` y el «si no», hasta 5 contando él; cada `si`, de
1 a 3 condiciones unidas con Y; cada contenido, un texto, un dato o `vacio`). **Una condición** (`CondicionDeLaTarjeta`): `{es: 'vacio' | 'no_vacio', dato}`
(si un dato tiene valor), `{es: 'cero' | 'no_cero' | 'encendido' | 'apagado', nodo}`, `{es: 'mayor' | 'menor' | 'igual', nodo, a}` (`a`, un número) o
`{es: 'opcion', nodo, opcion}` (la clave de una opción de la variante). **El asesor** de
las variables `asesor_*` y de la foto es **quien mira o comparte la tarjeta** (`leerAsesorQueMira()`: `perfiles` por PK; con «Ver como», la persona real),
nunca quien la creó, que es el autor («Creado por» de «Compartir»): la misma guardada dice «Ana» si la mira Ana y «Luis» si la mira Luis. **Estilo** (todo opcional): `fondo` y `texto` (una clave del catálogo de colores o `auto`, por omisión), `negrita`, `cursiva`,
`tamano` (10, 11, 12, 14, 16, 18, 22 o 28 px; 12 por omisión), `alinear` (izquierda por omisión), `alinear_vertical` (centro por omisión) y `bordes`
(`{todos?, arriba?, derecha?, abajo?, izquierda?}`, cada lado `ninguno` | `fino` | `grueso`; un lado gana sobre `todos`). Nunca un hex: `fondo: auto`
es blanco y `texto: auto`, #1b2130 o blanco, el de más contraste sobre el fondo; un color borrado del catálogo se dibuja `auto`. **Tope: 24 KiB
(24.576 bytes) del texto del `jsonb`**, contados como el de la forma 1.

**La forma 1:** `{grupos: [{grupo, tono?}], etiquetas?, leyendas?, total: {etiqueta, leyenda?}, nota?, logo, columnas: {leyenda, tipo_cambio,
plazo}}`, estricta y de hasta 32 KB: hasta 20 grupos (cada `grupo` y `tono` con la forma de un id), etiquetas (1 a 60 caracteres) y leyendas (0 a 160;
vacía = sin leyenda) por id de nodo, hasta 200 de cada una; la etiqueta del total de 1 a 40, su leyenda hasta 160 y la nota hasta 300. Los textos se
cuentan en caracteres. Sin hex ni CSS.

**`validar_plantilla(plantilla, def, diseno, visibilidad, tonos)`:** STABLE, invocadora, `search_path` vacío, sin leer tablas; 22023 con la regla en
DETAIL y el `donde` en HINT; el primer rechazo manda. Con `def` nulo, sólo la forma (y en la forma 2, las reglas de la grilla).

- **Forma 2**, en este orden: `forma` (el objeto y sus 24 KiB, `definicion`; la clave de más en orden C; `forma` = 2; cada columna, fila y celda con
  su ruta: `columnas[1].ancho`, `celdas[3].estilo.tamano`), `demasiadas_columnas` (`columnas`), `demasiadas_filas` (`filas`), `demasiadas_celdas`
  (`celdas`), `columna_repetida`, `fila_repetida`, `celda_repetida` (la segunda aparición: `columnas.<id>`…), `ancho_total` (`columnas`),
  `celda_fuera_de_la_grilla`, `celdas_se_pisan` (la primera que ocupa una casilla ya ocupada), `variable_inexistente` (`celdas.<id>` o `filas.<id>`, por
  una condición), `respaldo_vacio` (la primera lista de respaldo con menos de 2 datos); con la versión,
  `tono_inexistente` (sólo con `tonos`), `nodo_de_fila_inexistente` (`filas.<id>`), `nodo_inexistente`, `mostrar_no_admitido`, `nodo_restringido`
  (los nodos de las filas en orden y después los de las celdas; de un `porcentaje`, también su `pct`; **no figurar cuenta como restringido**) y
  `tipo_de_cambio_restringido` (por cada celda `tc_*`, el nodo del bucket de su grupo por omisión y en cada modo) y, al final, `condicion_invalida` (una
  condición que el nodo no puede responder: `opcion` sobre lo que no es la variante o con una clave que no tiene, `encendido` o `apagado` sobre lo que no es
  una bandera, un número sobre la variante). El `donde` nombra la fila o la celda y el mensaje también, **nunca el nodo**. `grupo_*` y `nodo_sin_lugar` no
  aplican. Las reglas de las variables y de los nodos miran **todo dato que la cuadrícula nombra, aplanado y en orden** (`datosNombrados()`, espejo
  `_plantilla_cuadricula_datos()`): las filas (su nodo y los de sus condiciones) y después las celdas (su dato, los de su lista, los de las partes de un texto con datos o, de sus
  condiciones, rama por rama las condiciones y su contenido, y el «si no»). Las ramas y el «si no» siguen con un texto simple. Un nodo de una condición que no es del nivel «todos» es `nodo_restringido`, como el de una celda.
- **Forma 1**, en este orden: `forma` (la clave o el índice), `grupo_inexistente`, `grupo_repetido`, `grupo_faltante` (la tarjeta lleva **todos** los
  grupos de la fórmula: lo que se ve suma el total), `tono_inexistente` (sólo con `tonos`), `nodo_inexistente` y `nodo_sin_lugar` (una clave de
  `etiquetas`/`leyendas` es un miembro de un grupo, el total o lo aparte de `tarjeta_total`), `nodo_restringido` (un miembro, el total o lo aparte sin
  `ver: todos`) y, con `columnas.tipo_cambio`, `tipo_de_cambio_restringido`.
- Juego común: `entities/plantilla/casos-de-plantilla.json` (lo corren `plantilla-validar.sql` y `validarPlantilla()`; los casos «borde: …» cazan las
  trampas del espejo y `octetos` fija el texto de `jsonb` que cuenta los topes). `demasiadas_celdas` no tiene caso: 1.001 celdas pasan de 24 KiB y sólo
  se alcanza sin el tope (T2b). Un número no canónico (`24.0`, sólo por un RPC a mano) es entero para los dos, pero sus bytes difieren: manda la base.
  `plantilla_guardar_borrador` valida la forma; `plantilla_publicar`, contra la fórmula **publicada** del origen y los colores del catálogo, antes de
  archivar nada (sin fórmula publicada, `formula_sin_publicar@origen`). La tabla la lee sólo quien tiene `cotizaciones.configurar` del origen.

**La conversión de la forma 1** (`convertirPlantilla()`, espejo `_plantilla_convertir()` con el juego `casos-de-conversion.json`, que genera TS y
corre `plantilla-convertir.sql`): pura y determinista, con la misma apariencia de hoy. Columnas (sólo las que van): `grupo` (100 px, si algún grupo
tiene miembros), `concepto` (190), `monto` (130), `leyenda` (170) y `tipo_cambio` y `plazo` (90, con la columna del grupo). Filas: el logo arriba con 2
columnas; `titulo` (el título de la opción, si la variante es del nivel «todos»), `fecha` (la fecha y, a su lado, el título de la cotización: se corta
a un renglón, entero en «Copiar texto»), `numero` («Cotización n.º» y el número) y `asesor`
(«Asesor:» y el nombre), con el logo al costado (`c_logo`) desde 3 columnas; `vehiculo`; `cabecera` («Tipo de cambio» y «Plazo», una vez); una fila
`n_<nodo>` por miembro de cada grupo (en el orden de la plantilla y de la fórmula, con `ocultar_si: no_aplica` y el color del grupo: el de la plantilla
si sigue en el catálogo, si no el del grupo), con el título del grupo, el tipo de cambio y el plazo abarcando las filas del grupo; `total` (en dos
renglones: la moneda local va debajo) con su leyenda en su columna o en `total_leyenda`; `a_<nodo>` por lo aparte (`no_aplica`); `nota`. **Ids
deterministas**: el texto si cabe en 41 caracteres; si no, sus primeros 32, `_` y el FNV-1a de 32 bits del texto (`ids-de-la-conversion.ts`); celdas
`c_<fila>_<columna>`. **Altos** con aritmética entera (`altos-de-la-conversion.ts`). Una forma 1 cuya conversión rompe una regla de la cuadrícula (más
de 120 filas o 1.000 celdas, un `{{` en una etiqueta o nota) se trata como `sin_plantilla`; lo convertido no se mide contra los 24 KiB.

**El modelo de dibujo** (`entities/tarjeta/geometria-de-la-tarjeta.ts`): de la cuadrícula, la lectura, el cálculo (valores, estados y totales por id) y
el contexto de la cotización (las variables, ya formateadas: `contextoDeLaPagina()`), el ancho y el alto en px y, por celda visible y en orden de
lectura, su rectángulo, su contenido resuelto y su estilo; más las filas ocultas con su motivo: `fuera_de_la_version` (el nodo de la fila no está en
los estados del cálculo, salvo el total), `no_aplica` (con `variante`: el título de la opción elegida, si la lectura trae la variante), `cero` o
`condicion` (se cumplen sus condiciones). **Antes de dibujar, resuelve** cada celda (`resolverElContenido()`, `entities/tarjeta/condiciones-de-la-celda.ts`):
una lista de respaldo da el primero de sus datos con valor (`tieneValor()`) o, si ninguno, la celda vacía; unas condiciones, el contenido de la primera rama
cuyas condiciones se cumplen todas o, si ninguna, el «si no». Una condición lee un nodo así: 0 si no aplica, su número si aplica y nulo sin valor (una
comparación con nulo no se cumple; `encendido` es «distinto de 0»; `opcion` compara la clave elegida); un nodo que no está en la versión del cálculo deja la
condición sin respuesta, que cuenta como que no se cumple (la rama se salta y la fila no se oculta). Así los tres dibujos y «Copiar texto» sólo ven un
contenido simple, y un cambio en cómo se resuelve sube `VERSION_DEL_DIBUJO`.
Los motivos son sólo datos de las ocultas: no cambian el dibujo. Una fila se oculta si su nodo no aplica (o vale 0) y
las celdas que la cruzan se acortan; un dato de un nodo que no aplica, en una fila que se dibuja, va vacío; un monto nulo, «—». El monto del total sale
de los totales y, con «Ver total Bs», lleva la segunda línea en moneda local. Sin plantilla o sin estados, la tarjeta por omisión (`por-omision.ts`).
Lo pintan tres dibujos con posiciones absolutas (satori no tiene `grid`): el HTML (escalado como una imagen, `min(1, ancho del contenedor / ancho)`),
el PDF y la imagen (`pngDeLaTarjeta()`, al ancho de la tarjeta). «Copiar texto» sale de la misma geometría (`textoDeLaTarjeta()`).

### Versiones de la plantilla

Cada fórmula del origen tiene su plantilla: a lo sumo un borrador y una publicada (`plantillas_borrador_unico`, `plantillas_publicada_unica`, por
`formula_del_origen_id`). Las tres RPC reciben `p_formula_del_origen` al final (nulo: la de trabajo; guardar la crea si el origen no tiene ninguna) y
publicar valida contra la publicada de **esa** fórmula. Guardar el borrador, publicarlo y descartarlo piden la versión que se vio
(`plantillas_tarjeta.actualizado_en`, como texto: un `Date` pierde los microsegundos) y pasan en serie por un candado por origen (`pg_advisory_xact_lock(hashtextextended('plantillas:' || origen,
0))`), tomado tras el permiso (`cotizaciones.configurar` del origen) y lo que se rechaza sin mirar el estado, y antes de leer el borrador
`for update`. Sin el candado, dos publicar a la vez publicarían las dos.

- `plantilla_guardar_borrador(p_origen, p_actualizado_en_esperado, p_def, p_nota default null) returns timestamptz` (la versión nueva).
  **Esperada nula = crear**: sin borrador lo inserta; con borrador, PT409 «Ya hay un borrador de esta plantilla, guardado hace 2 min.» y
  nada cambia. Con la esperada, un borrador de otra versión da PT409 «El borrador de esta plantilla cambió hace 2 min, mientras lo
  editabas.» (sin nombre: la tabla no guarda quién). La forma se valida antes del candado.
- `plantilla_publicar(p_origen, p_actualizado_en_esperado, p_nota) returns uuid` (en `uuid` a propósito: una función que devuelve `jsonb`
  y lee `public.formulas` cae en el inventario de lo oculto de `cotizaciones-visibilidad.sql`). Esperada nula: la excepción de
  `_exigir_version()`, sin PT409. Nota en blanco: 22023 «Publicar pide una nota.» (hint `nota`). Después valida contra la fórmula publicada
  y los tonos; un rechazo no archiva nada.
- `plantilla_descartar_borrador(p_origen, p_actualizado_en_esperado) returns void`: borra el borrador de esa versión; otra versión, PT409.
- **Sin borrador y con esperada** (`_plantilla_borrador_ausente()`), PT409: «El borrador ya no está: la versión 3 se publicó hace un
  momento.» si la publicada tiene `publicado_en >= esperada`; si no, «El borrador ya no está: se descartó.».
- Dentro de una transacción `now()` no se mueve (el trigger genérico): una esperada «vieja» es la de la fila menos 1 µs en `db:probar`;
  que guardar mueve la versión entre transacciones lo prueban las carreras (`scripts/carreras/plantillas.mjs`).

### Lo que lee y escribe la plantilla desde TypeScript

- **La versión esperada** es el `actualizado_en` de la base como texto con microsegundos (`z.iso.datetime({ offset: true })`, nunca
  `Date`); `guardar` la manda siempre (`null` explícito para crear), manda la forma 2 y no manda `p_nota`. Un 22023 de `validar_plantilla()` va a
  `porCampo[donde]` con el mensaje de la base; «Publicar pide una nota.», a `porCampo.nota`; el PT409 es un conflicto sin nombre. Guardar
  sólo valida la forma; lo que cruza con la fórmula y los tonos lo rechaza publicar.
- **Texto que la base no lee** (`\u0000`, surrogate suelto: 22P02, 22P05): la action lo ataja antes (`revisarTextoParaLaBase()`, tope de 8
  niveles) y lo dice junto al campo.
- **La lectura** (`leerPlantillaDelOrigen()`, con la sesión de quien mira): borrador y publicada, cada una con su `contenido`
  (`versionDePlantilla()`: `{forma: 1, plantilla}`, `{forma: 2, cuadricula}` —una cuadrícula guardada no se vuelve a medir contra los 24 KiB— o
  `{motivo}` si perdió la forma), la fórmula publicada con lo que mira el validador (con el par `op`/`pct`) y los colores (tope 48); sin fórmula publicada
  no hay contexto.

### El editor de la plantilla

- **La pestaña «Tarjeta»** (`/configuracion/origenes/<id>/tarjeta?formula=<fórmula>`, `cotizaciones.configurar`, a todo el ancho) edita el **borrador** como un
  Excel y escribe **sólo la forma 2**. El servidor arma `propsDelEditor()`: la cuadrícula de la que nace (`cuadriculaParaEditar()`: el borrador; si no se
  lee, la copia de la publicada; si no, la de por omisión), su procedencia, sus avisos y el contexto reducido. Una forma 2 se usa tal cual; una forma 1
  pasa por `alinearConLaFormula()` y `convertirPlantilla()` con «Se convirtió a cuadrícula: revisa y guarda.» (no se guarda sola); sin plantilla, la
  omisión convertida (los grupos de la fórmula y el total). Si lo convertido no entra en la grilla (más de 120 filas o 1.000 celdas), se convierte con los
  primeros 4 miembros de cada grupo (`FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA`) y, si tampoco, sólo con el total, y lo dice.
- **El contexto reducido** (`contextoParaElNavegador(contexto, cuadricula)`): los nodos del nivel «todos» (lo que «Dato» ofrece), los restringidos que la
  cuadrícula ya nombra, también en sus listas y condiciones (`nodosNombradosPor()`; marcados: con ellos no se podría publicar), los del tipo de cambio de cada bucket y la variante; de cada uno etiqueta, grupo,
  salida, descripción y el par `tipo`/`op`/`pct`, y el `{ver}` de la visibilidad. Nunca el cuerpo de un nodo ni la `definicion` entera.
- **El lienzo es un hueco:** el área `plantilla` no importa la geometría (es del área `tarjeta`). La página pasa `LienzoDeLaPlantillaDiferido`
  (`pantallas/tarjeta-plantilla.ts`, tipos en `entities/vista-previa-de-la-plantilla.ts`): recibe la lectura de la cuadrícula de trabajo
  (`lecturaEnCuadricula()`, recalculada en cada cambio), la referencia, «Ajustar | 100 %» y el margen de la capa («Ajustar» mide el contenedor del marco,
  `data-medida-del-lienzo` con `contain: inline-size`, y deja el margen de la capa a los dos lados); dibuja la tarjeta con
  `geometriaDeLaTarjeta()` y llama a `capa(g, escala)` (la grilla del editor, encima, sin escalar: multiplica por la escala) y a `debajo(g)` («Ocultas con
  esta referencia»). `GeometriaParaEditar` lleva el tamaño, las filas que se dibujan con su banda y las ocultas; la `x` de cada columna la saca la capa
  de los anchos de la plantilla, así no repite la regla de qué fila se oculta.
- **La referencia** (`ReferenciaDeLaTarjeta`, núcleo): la compone `src/app` (`formulas/[formula]/tarjeta/referencia.ts`, `server-only`, nunca lanza) como el PDF:
  `leerListadoDeCotizaciones()` con `UNA` (la más reciente que quien configura ve, sin papelera, por `cotizaciones_origen_creado_idx`), la hoja guardada
  con su primer recálculo, el cliente y el vehículo por PK, el asesor (quien configura) y los ajustes, y `referenciaPlana(calculoDeLoGuardado(…))`. Sin estados (el
  recálculo falló) es `no_se_leyo`: la tarjeta caería a la de por omisión. La página la pide sin esperarla y `SeccionDeLaPlantilla` la espera en paralelo
  con la plantilla, y la recorta a los ids del contexto reducido (`recortarLaReferencia()`). Sin cotización o ilegible, las cifras de ejemplo: la fila
  n-ésima con nodo vale `(n mod 8 + 1) × 250` USD, cada `pct` 5 %, cada tipo de cambio 6,96 y el total es la suma de los miembros. `?referencia=ejemplo`
  las pide aunque haya cotización, sin ir al servidor.
- **Las operaciones** son puras (`entities/plantilla/edicion/`): el mapa de la grilla, la selección (un rango que corta una combinación se agranda),
  contenido, estilo, combinar y separar, insertar y eliminar (una combinación que cruza crece o se achica; insertar en su borde no la cambia), anchos y
  altos, «Ocultar si…», mover una fila (no si es parte de una combinación vertical), copiar y pegar un bloque. Cada una se mide después
  (`medido()`): se rechaza con su motivo si pasa un tope **y crece** (16 columnas, 120 filas, 1.000 celdas, 1.600 px, 24 KiB: el que manda) o rompe una
  regla de la grilla. Ids nuevos: el menor libre en base 36 (`c1`, `f1`, `k1`). El reductor (`reductor.ts`) une selección, operaciones, el bloque
  copiado, la celda en la que se escribe y el historial (`historial.ts`: instantáneas, tope 100, lo escrito en un campo se junta por clave hasta que
  cambia la selección); la barra y el menú prueban cada operación en seco (`disponibilidad.ts`) para apagarla con el motivo del reductor.
- **El texto con datos** (`entities/plantilla/edicion/texto-con-datos.ts`, sobre `entities/texto-con-datos.ts`): el campo de «Contenido: Texto» es un
  `contentEditable` con «Insertar dato», que abre el buscador de «Dato» y pone una **pastilla** en el cursor (su nombre: «% Transferencia a USA»). El modelo
  cuenta posiciones en unidades (cada code unit, 1; cada pastilla, 1) y maneja Enter, pegar, Retroceso y Supr junto a una pastilla (la borra entera) y las
  flechas; lo escrito se **normaliza** (junta los textos seguidos, quita los vacíos y, sin datos, escribe `{tipo: 'texto', texto}`). «n de 300» cuenta sólo
  el texto; pasar de 20 partes apaga «Insertar dato» con su motivo. Insertar o cambiar un dato es su propio paso de deshacer; lo tipeado se junta por clave.
  En el lienzo, Enter o F2 (o doble clic) sobre una celda con datos lleva al campo del panel, sin escribir en el lugar; copiar como texto (TSV) pone sólo sus
  partes de texto y la copia interna de celdas las conserva.
- **«Cuál dato» y las condiciones:** «Dato» lleva «Cuál dato» (Uno | El primero con valor | Según condiciones) y «Ocultar la fila», «Según condiciones».
  Lo que se arma vive en un **borrador del panel** (`useBorradorDeLaRegla()`, sobre `entities/plantilla/edicion/condiciones.ts` y
  `borradores-de-la-celda.ts`): se manda al reductor sólo entero y distinto de lo que hay (la celda o la fila no cambian a medias); lo que cambia afuera
  (deshacer) entra si el borrador estaba entero. Pasar a la lista o a las condiciones arma desde el dato de la celda; volver a «Uno» deja su primer dato. Los
  topes y los mínimos apagan sus botones con el motivo (`motivoParaSumar*`, `motivoParaQuitar*`). Lo tipeado en un texto de rama o en un número se junta en
  un paso de deshacer (por clave). Su código llega por `diferido()` (`panel/diferidos.tsx`).
- **Validar:** `validarPlantilla(plantilla, null, {conTope: false})` para la forma, los 24 KiB aparte (apagan «Guardar borrador»), y con el contexto
  reducido para «Con esto no se podría publicar». Lo tipeado sin guardar va en `sessionStorage` (`tarjeta-cuadricula:<origen>:<esperada>`) y se repone
  sólo si sigue siendo una cuadrícula.
- **Guardar, publicar y descartar** (`?panel=publicar-tarjeta` con nota obligatoria, `?panel=descartar-plantilla` con `<Confirmar>`) mandan la `esperada`
  como texto; el PT409 se dice tal cual. «Publicar…» sólo sin cambios sin guardar. Un rechazo de publicar con un `donde` de la cuadrícula
  (`celdas.<id>`, `filas.<id>`, `columnas.<id>`) ofrece «Ir a la celda», que lo elige en el lienzo (`seleccionDelDonde()`). Los modales van **fuera de la
  `key`** del editor (`PestanaDeLaTarjeta`): «Recargar» no pierde la nota. Esa `key` cambia con una versión que no es la que el editor acaba de
  guardar (`useClaveDelEditor()`): guardar no remonta el editor y el historial sigue; «hay cambios» compara sin el orden de las claves (`mismoJson()`). En una pantalla de menos de 1.024 px la pestaña dibuja el aviso y el lienzo sin
  capa, y el código del editor no se pide.

### La lectura de la tarjeta

**`cotizacion_tarjeta(p_formula)`**, `security definer`, da lo que dibuja la tarjeta de **una versión** de la fórmula. Pide
`cotizaciones.ver` (cualquier alcance) del origen de la versión; una versión que no existe y un borrador dan el mismo 42501 que no tener el
permiso, también a la dueña. La plantilla es la **publicada hoy** de la fórmula del origen de esa versión, validada otra vez contra **esa** versión (sin el catálogo); la de la forma
1 se convierte (con el catálogo de hoy: un color borrado cae al del grupo) y lo convertido se valida sin el tope. Si no le sirve, `{estado:
'sin_plantilla'}` sin regla ni `donde` (la tarjeta «por omisión»). Con ella, `{estado: 'lista', plantilla: {version}, definicion: <forma 2>, nodos:
[{id, etiqueta, descripcion, grupo, pct}], grupos: [{id, etiqueta, plazo, bucket}], tipos_de_cambio: {buckets: {b: {nombre, nodo}}, modos: {clave:
{b: {nombre, nodo}}}}, modos: [{clave, nombre}], variante: {nodo, opciones: [{clave, titulo}]} | null, colores: [{clave, hex}], total: {nodo},
moneda_bs}`, **sólo lo que la cuadrícula nombra**: los nodos de las filas y de las celdas, también los de sus listas de respaldo, ramas, condiciones y las partes
de un texto con datos (todo dato de `_plantilla_cuadricula_datos()`; y el `pct` de un `porcentaje`, sólo entonces), los grupos de
un `tc_*` o un `plazo`, el tipo de cambio de esos buckets por su `nombre` de `tipos_cambio` (nulo si no hay uno activo) y su nodo (del nivel «todos»:
lo exige la plantilla; su valor sale del snapshot), los modos si se muestra `modo_tc`, la variante si se muestra `titulo_opcion` y es del nivel
«todos», y los colores del catálogo que nombran los estilos. **Ningún id, etiqueta ni texto de un nodo sin `ver: todos` sale, para nadie** (K4 de
`cotizacion-tarjeta.sql`, por cada nivel, en la forma 1 convertida y en cada forma de nombrar un nodo en la cuadrícula; el inventario de
`cotizaciones-visibilidad.sql` la registra).

### Retoques de la tarjeta

Los **retoques de la tarjeta** cambian textos y ocultan filas de la tarjeta de **una** cotización guardada, sin tocar la plantilla del origen. Se
guardan en `cotizaciones.tarjeta_retoques`: `{celdas?: {<id de celda>: texto}, filas_ocultas?: [<id de fila>]}` (nula: la tarjeta tal cual la
plantilla). Sólo el texto de las celdas `texto` de la cuadrícula (también un texto con datos: el retoque la reemplaza entera
por un texto fijo, y el campo arranca con su texto resuelto, contra el que se compara: reponerlo no es un retoque, `textosConDatosResueltos()`) y filas enteras: nunca las celdas de `dato` (montos, etiquetas, tipos de cambio,
variables), las de una lista de respaldo o unas condiciones (aunque la rama que se dibuja sea un texto: `celda_no_es_texto`; el modo dice «Esta celda cambia
según la cotización: no se retoca.»), el logo, los colores, los tamaños, las columnas ni las combinaciones. Una fila que se oculta según condiciones se
puede ocultar a mano. Con el Modo Live, un texto con datos que lleva un monto no abre su campo (dice «Este texto lleva un monto: apaga el Modo Live para
cambiarlo.») y su botón lo nombra con el monto tapado («•••», `entities/tarjeta/retoques/live-del-modo.ts`); el rótulo de una fila nunca es un texto con
un monto (en el modo y en las filas ocultas: ningún nombre lleva una cifra).

- **`validar_retoques(retoques, plantilla)`**: STABLE, invocadora, `search_path` vacío, sin leer tablas; 22023 con la regla en DETAIL y el `donde` en
  HINT; el primer rechazo manda. Con la plantilla nula, toda celda y toda fila es inexistente. En este orden: `forma` (el objeto, `retoques`),
  `demasiado_grande` (más de 24 KiB del texto del `jsonb`, el tope de la cuadrícula; `retoques`), `forma` (la clave de más en orden C; `celdas` que
  no es un objeto); por cada celda en orden C (`celdas.<id>`): `forma` (no es un texto), `celda_inexistente`, `celda_no_es_texto` y `texto_largo` (más
  de 300 caracteres); `forma` (`filas_ocultas` que no es un arreglo); por cada fila en su orden: `forma` (`filas_ocultas[i]`), `fila_inexistente` y
  `fila_repetida` (`filas_ocultas.<id>`). Un `{{` se dibuja tal cual: en la cuadrícula nada interpola. Espejo `validarRetoques()`
  (`entities/tarjeta/retoques/`) con el juego `casos-de-retoques.json`, que corren Vitest y R1 de `supabase/tests/areas/tarjeta/retoques.sql`.
- **`cotizacion_retocar_tarjeta(id, actualizado_en_esperado, retoques)`**, `security definer`: pide lo que pide guardarla
  (`_cotizacion_puede_guardar()`) antes y después de tomar la fila `for no key update`; la papelera, lo que no existe y lo que no se ve dan el mismo
  42501; la versión va antes que la validación (el PT409 de `_conflicto_de_edicion()`: quién y cuándo). Valida contra **lo que se dibuja hoy**: la
  cuadrícula de `cotizacion_tarjeta(formula_id)` si está `lista` (la publicada del origen, convertida si es de la forma 1 y validada contra la versión
  de la cotización); si no, ninguna. Nulo, `{}` o lo vacío dejan la columna nula (`_retoques_normalizados()`); los mismos retoques que hay no escriben
  nada (ni versión, ni revisión, ni actividad). Devuelve `{actualizado_en, retoques, repetido}`. Retocar mueve `actualizado_en`: es guardar la
  cotización (cambian la fecha del último guardado de la tarjeta y la huella de su imagen).
- **Al dibujar**, `aplicarRetoques()` cambia el texto de las celdas de texto que están y quita las filas ocultas antes de la geometría, reparando las
  combinaciones: una celda que empieza en una fila oculta pasa a la primera fila que le queda, la que la cruza se acorta y la que se queda sin filas no
  se dibuja. Un retoque de una celda que ya no está o dejó de ser de texto, o de una fila que ya no está, **no aplica**: se ignora y se cuenta. Todo lo que
  dibuja esa tarjeta pasa por ahí: la vista previa, «Copiar texto», el PDF, compartir y la imagen de la tarjeta (`lecturaRetocada()` en `geometriaDeUnaGuardada()` y
  en `useModeloDeLaTarjeta()`). El modo «Retocar» dice cuántos no aplican y «Listo» guarda sólo los que aplican.
- **La revisión** guarda cuántos hay (`{celdas: n, filas_ocultas: m}` por lado, `_retoques_resumen()`), nunca los textos, y «Revisiones» dice «Retocó
  la tarjeta» (también al volver a la plantilla). La actividad la deja `cotizacion_auditar()`, con quien retocó.
- **Cotizar encima** se los lleva, como el título y las notas; los que no apliquen a la plantilla de hoy se ignoran al dibujar.

### El PDF

`GET /cotizaciones/<id>/pdf` da la tarjeta de una cotización **guardada** en una página A4: la misma `geometriaDeLaTarjeta()` que «Vista previa»,
escalada entera al menor factor que la hace entrar (`min(1, ancho útil / ancho, alto útil / alto)`, con 1 px = 0,75 pt y 36 pt de margen: una fila
nunca se corta), con
`calculoDeLoGuardado()` (valores y totales del snapshot, los estados del primer recálculo), así el PDF dice lo mismo que la tarjeta de esa
guardada y nunca lo de hoy. Lee `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)` y `cotizacion_tarjeta(p_formula)` con la
sesión de quien pide: lo descarga quien ve la cotización, sin clave propia, y lo que un nivel esconde no está (sólo lo del nivel «todos»).
Lo que no existe, está en la papelera o no se ve es el mismo 404 en texto que la página. El total impreso es el del snapshot: con dos tipos
de cambio **no es la suma de las filas** sino Bs ÷ tc(`total_en`), con Bs = Σ grupo × tc(su bucket); `e2e/cotizar-pdf.spec.ts` lo cuenta
con las filas impresas y la tolerancia del redondeo. Los montos van con el texto de `valor-del-dato.ts` (los «Decimales» de su celda; sin ellos, `formatearMonto()`) y siempre con cifras (el Modo Live es de la
pantalla); el logo, en `Buffer` por `logoParaDibujar()`, que pasa a PNG lo que react-pdf o satori no leen (WebP, SVG con estilos). Lo dibuja
`src/modules/cotizaciones/infra/tarjeta/pdf/` con `@react-pdf/renderer` y Geist en TTF (recta e itálica). La misma tarjeta como PNG:
`imagenDeUnaGuardada()` (`infra/tarjeta/imagen/`, `ImageResponse`), la base de la imagen de la tarjeta.

### La imagen de la tarjeta

La **imagen de la tarjeta** (glosario) es la tarjeta de una cotización guardada como imagen, **para quien la pide**: la de lo guardado (como el PDF), con
lo que esa persona ve (el cliente sólo con `leads.ver`, el vehículo con `vehiculos.ver`, como el PDF) y ella como asesor, en WebP de hasta 1.600 px de ancho
(calidad 80, con `sharp` en el servidor; la miniatura de las listas, de 480 px, achicada del mismo PNG). **Se arma al pedirla y no se guarda**: ni tabla ni
objetos en el bucket. Lo que evita volver a dibujarla es la caché del navegador con su `ETag`.

- **La huella** dice de qué está hecha para quien pide: `cotizacion_imagen_huella(id)` (definer; pide ver la cotización: 42501 igual para lo que no existe,
  está en la papelera o no se ve) = `i-md5` de todo lo que el dibujo lee: la cotización (`actualizado_en`, la versión, el origen), la plantilla publicada
  del origen (o ninguna), esa versión de la fórmula, los colores (clave y hex), los tipos de cambio (nombre, activo y moneda; nunca el valor del día), el
  cliente y el vehículo vivos **sólo si quien pide los ve** (nombre; título, lote y VIN: no su `actualizado_en`, que una fase o una foto mueven), quien
  pide (su nombre, correo, WhatsApp, cargo y foto: el asesor) y los ajustes de la empresa. Todo por clave primaria o índice único, y dos catálogos de
  decenas de filas. Devuelve sólo el md5.
- **La ETag** la arma la app (`etiquetaDeLaImagen()`): `"<huella>.<usuario>.v<VERSION_DEL_DIBUJO>.<ancho o g>"`. El usuario va aparte para que dos
  personas nunca compartan una; un cambio en cómo se dibuja sube `VERSION_DEL_DIBUJO` (`entities/tarjeta/etiqueta-de-la-imagen.ts`), sin migración.
- **La ruta** `GET /cotizaciones/<id>/imagen` (`requerirSesion()`; `?ancho=480`, la miniatura; otro ancho se ignora): lo que no existe, está en la papelera
  o no se ve, el mismo 404 en texto que el PDF. Con un `If-None-Match` igual (también `W/` o en una lista), 304 sin dibujar nada; si no, la arma y la
  entrega con la `ETag` y `Cache-Control: private, no-cache`. Con «Ver como» (la perspectiva cambia los permisos, no la persona), sin el primer recálculo
  (la tarjeta saldría sólo con el total) o incompleta (falló leer el cliente, el vehículo o el asesor, o no llegó el logo o la foto que la tarjeta dibuja:
  `ImagenArmada.completa`), `no-store` y sin `ETag`: la huella no ve esos fallos y la ETag dejaría fija la imagen a medias. Si armarla falla, 500 en texto con `no-store`: nunca una vieja. `Server-Timing` dice
  cuánto tardaron la huella y el armado.
- **En pantalla**, `<ImagenDeLaTarjeta>` (`pantallas/tarjeta-imagen.ts`; en el resumen del listado, por el hueco `Imagen`): la imagen con
  `object-contain` en un marco de la proporción que le dan (15:8 por omisión), pedida recién a la vista y con turno en la cola de la página (a lo sumo
  cuatro a la vez: `useCargaDeLaImagen()`, `crearCola()`); mientras espera o carga, un recuadro del mismo tamaño con el
  total y «Preparando la imagen…»; si falla, «No se pudo armar la imagen.» con «Reintentar» (otra URL, `?intento=`); el clic la abre en el visor de
  fotos (`?visor=imagen-<id>`, o `imagen-de-la-lista-<id>` desde la tarjeta de la lista; `portada-…` y `portada-de-la-lista-…` también lo abren); en Modo
  Live, borrosa con «Oculto en Modo Live» y sin visor.
