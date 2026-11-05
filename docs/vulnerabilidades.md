# Corrección de vulnerabilidades de dependencias

Auditoría reproducida el 5 de noviembre de 2026 con npm 11.9.0 y Node.js 24.22.1. El resultado inicial coincidió exactamente con el reportado: **19 entradas vulnerables: 6 moderadas, 12 altas y 1 crítica**. Todas procedían de la dependencia de pruebas Newman; la auditoría de producción ya tenía cero. Se corrigió el árbol completo, incluidas las herramientas de desarrollo.

La entrada crítica correspondía a Handlebars. Las causas incluían inyección de código en Handlebars/Faker/Lodash, contaminación de prototipos, fallos criptográficos de node-forge y agotamiento de recursos. Varias entradas eran propagación de esas causas a paquetes que dependían de ellas; no representan necesariamente 19 fallos independientes.

## Análisis de las 19 entradas

| Paquete | Severidad inicial | Versión inicial | Corrección aplicada |
| --- | --- | --- | --- |
| @faker-js/faker | high | 5.5.3 | Versión corregida 10.6.0 |
| csv-parse | moderate | 4.16.3 | Versión corregida 7.0.3 |
| flatted | high | 3.2.6 | Versión corregida 3.4.4 |
| handlebars | critical | 4.7.8 | Versión corregida 4.7.10 |
| httpntlm | high | 1.8.13 | Dependencias vulnerables sustituidas por versiones corregidas |
| jose | moderate | 4.14.4 | Versión corregida 4.15.9 |
| lodash | high | 4.17.21 | Versión corregida 4.18.1 |
| newman | high | 6.2.3 | Dependencias vulnerables sustituidas por versiones corregidas; parche de adaptación a CSV 7 |
| node-forge | high | 1.3.1 | Versión corregida 1.4.3 |
| postman-collection | high | 4.4.0 | Dependencias vulnerables sustituidas por versiones corregidas; adaptación a Faker 10 |
| postman-collection-transformer | high | 4.1.8 | Dependencias vulnerables sustituidas por versiones corregidas |
| postman-request | moderate | 2.88.1-postman.34, 2.88.1-postman.48 | Dependencias vulnerables sustituidas por versiones corregidas |
| postman-runtime | high | 7.39.1 | Dependencias vulnerables sustituidas por versiones corregidas |
| postman-sandbox | high | 4.7.1 | Dependencias vulnerables sustituidas por versiones corregidas |
| qs | moderate | 6.14.3, 6.5.5 | Versión corregida 6.17.1 |
| serialised-error | moderate | 1.1.3 | Dependencias vulnerables sustituidas por versiones corregidas |
| underscore | high | 1.12.1 | Versión corregida 1.13.8 |
| uuid | moderate | 3.4.0, 8.3.2 | Versión corregida 11.1.1 |
| uvm | high | 2.1.1 | Dependencias vulnerables sustituidas por versiones corregidas |

## Implementación reproducible

- `package.json` fija diez dependencias transitivas corregidas mediante overrides. Newman 6.2.3 se conserva y se fija exactamente para que los parches sean reproducibles. No se ejecutó audit fix --force ni se ignoraron alertas.
- Faker 10 y CSV 7 cambian sus API. `patches/postman-collection+4.4.0.patch` adapta los nombres de variables dinámicas al Faker actualizado; `patches/newman+6.2.3.patch` usa la API parse de CSV 7 y su opción relax_quotes. No se conserva el Faker vulnerable.
- `patch-package` aplica esos parches durante postinstall y detiene la instalación si dejan de ser compatibles. `tests/apply-security-patches.cjs` omite únicamente esta tarea cuando Newman no está instalado, como en npm ci --omit=dev. No omite la auditoría.
- Node.js mínimo pasa de 22.12 a **22.13**, requisito del Faker corregido. Se recomienda Node.js 24 LTS.
- Las aplicaciones Express/React, los controladores y el esquema SQL permanecen en su estructura anterior. Los cambios de compatibilidad afectan a las herramientas de pruebas.

## Validación

- npm ci desde un árbol limpio: parches aplicados correctamente.
- npm audit completo: **0 vulnerabilidades conocidas**.
- npm audit --omit=dev: **0 vulnerabilidades conocidas**.
- npm ci --omit=dev en una carpeta independiente: instalación de producción correcta, sin requerir herramientas de desarrollo.
- tests/newman-compat.test.js ejecuta los 118 generadores de variables dinámicas y dos iteraciones CSV reales con BOM, comas, comillas y Unicode, incluyendo scripts Postman.
- La colección Postman mantiene sus 93 solicitudes y 94 aserciones.

Se aprobaron 10 pruebas unitarias/compatibilidad, 25 de integración, 6 de navegador, las 93 solicitudes/94 aserciones Postman y la compilación. La instalación de producción omitió correctamente las herramientas de pruebas. Las auditorías son instantáneas de los avisos conocidos en esta fecha, no una garantía de ausencia de cualquier defecto. Los avisos de obsolescencia de funciones de imágenes de Faker y de fs.F_OK son distintos de los avisos de seguridad y no se han ocultado.

## Repetir la comprobación

```sh
npm ci
npm run audit:deps
npm test
npm run build
```

La instalación debe ejecutar los scripts npm para aplicar los parches de compatibilidad. No usar --ignore-scripts para ejecutar Newman. Al actualizar Newman/Postman, revisar estos parches y repetir la colección y el caso CSV; los archivos fijados no se sustituyen a ciegas. La colección también puede importarse en Postman sin depender de Newman.

Evidencias: [auditoría inicial](auditoria-antes.json), [auditoría completa final](auditoria-despues.json) y [auditoría de producción final](auditoria-produccion.json).
