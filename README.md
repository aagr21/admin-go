# TrazaFuel

**Torre de Control Digital de Hidrocarburos** — Plataforma de trazabilidad, cumplimiento y operación para la industria de hidrocarburos en Bolivia.

---

## Descripción

TrazaFuel es una aplicación web que centraliza la operación de la red nacional de hidrocarburos: plantas, estaciones de servicio, tanques, cisternas, operaciones de transporte, documentos regulatorios, declaraciones y controles de calidad.

Proporciona una **Torre de Control** con indicadores en tiempo real, alertas derivadas por reglas, matriz de cumplimiento documental, validación de declaraciones (CHECK TRAZAFUEL) y exportación de reportes en PDF y Excel.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Angular 21 (standalone, signals, OnPush) |
| Lenguaje | TypeScript 5.9 |
| Estilos | SCSS con variables CSS semánticas |
| Test runner | Vitest 4 |
| Exportación PDF | jsPDF + jspdf-autotable |
| Exportación Excel | ExcelJS |
| Build | @angular/build (esbuild) |

---

## Desarrollo

### Requisitos

- Node.js 20+
- npm 12+

### Instalación

```bash
npm install
```

### Servidor de desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200/`.

### Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/`.

### Tests

```bash
npm test
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── core/                    # Núcleo: API, auth, datos, layout, modelos, reglas, servicios
│   │   ├── api/                 # Contrato de datos (TrazaFuelApi) + implementación en memoria
│   │   ├── auth/                # Autenticación, guards, permisos, roles, ámbito multiempresa
│   │   ├── data/                # Dataset de demostración y persistencia local
│   │   ├── layout/              # Shell (barra lateral + topbar) y navegación
│   │   ├── models/              # 24 entidades tipadas + enums
│   │   ├── rules/               # Motor de reglas puras (validación, cumplimiento, alertas)
│   │   └── services/            # Store central de la aplicación
│   ├── features/                # Módulos funcionales (19 pantallas)
│   │   ├── alerts/              # Alertas derivadas por reglas
│   │   ├── audit/               # Historial de auditoría
│   │   ├── cisterns/            # Cisternas y conductores
│   │   ├── companies/           # Empresas clientes
│   │   ├── compliance/          # Matriz de cumplimiento documental
│   │   ├── controls/            # Control operativo de planta
│   │   ├── dashboard/           # Torre de Control (KPIs)
│   │   ├── declarations/        # Declaraciones y CHECK TRAZAFUEL
│   │   ├── documents/           # Expedientes y versiones
│   │   ├── login/               # Acceso
│   │   ├── operations/          # Operaciones y Pasaporte Digital
│   │   ├── plants/              # Red de 16 plantas
│   │   ├── quality/             # Controles de calidad
│   │   ├── reports/             # Exportación PDF/Excel
│   │   ├── settings/            # Configuración de umbrales
│   │   ├── stations/            # Estaciones de servicio
│   │   ├── tanks/               # Tanques e inventario
│   │   ├── users/               # Usuarios y roles
│   │   └── volumes/            # Movimientos de volúmenes
│   └── shared/                  # Componentes y utilidades compartidas
│       ├── services/            # Exportación de reportes
│       ├── ui/                  # KpiCard, StatusBadge
│       └── util/                # Formato y estado
├── index.html
├── main.ts
└── styles.scss                  # Sistema de diseño (variables CSS)
```

---

## Arquitectura

### Capa de datos

El contrato `TrazaFuelApi` define todas las operaciones de lectura/escritura. La implementación actual es `InMemoryTrazaFuelApi` (dataset de demostración). Cuando exista backend, basta con implementar `HttpTrazaFuelApi` y cambiar el provider en `api.provider.ts`.

### Motor de reglas

Las reglas de negocio son **puras y deterministas**:

- **CHECK TRAZAFUEL** (§18): Validación de declaraciones con 7 reglas.
- **Matriz de cumplimiento** (§16): Requisitos × empresas.
- **Alertas derivadas** (§25): Generación automática con IDs estables.
- **Diferencias volumétricas** (§14): Clasificación con umbral configurable.

### Ámbito multiempresa

Los roles de TrazaFuel tienen visión nacional; el resto del personal solo ve los datos de su empresa.

### Permisos

Doble capa: **módulos** (qué pantallas puede abrir) y **acciones** (qué puede hacer dentro de ellas).

---

## Accesos de demostración

| Usuario | Rol | Contraseña |
|---------|-----|------------|
| `admin` | Superadministrador TrazaFuel | `demo123` |
| `mrojas` | Administrador cliente | `demo123` |
| `gerente.andina` | Gerente | `demo123` |
| `regulatorio.andina` | Responsable regulatorio | `demo123` |
| `sup.campo01` | Supervisor operativo TrazaFuel | `demo123` |
| `operador01` | Operador de campo | `demo123` |
| `eess.central` | Responsable EESS | `demo123` |
| `auditor.01` | Auditor | `demo123` |

---

## Características principales

- **Torre de Control**: Dashboard con KPIs consolidados, semáforo de plantas y alertas críticas.
- **Pasaporte Digital**: Trazabilidad completa de una operación (origen, destino, documentos, evidencias, incidencias).
- **CHECK TRAZAFUEL**: Validación automática de declaraciones antes de su presentación.
- **Matriz de cumplimiento**: Requisitos cruzados con empresas, con estado de cobertura.
- **Alertas inteligentes**: Derivadas del estado documental, operativo y volumétrico.
- **Auditoría campo a campo**: Cada escritura registra el cambio anterior → nuevo.
- **Reportes exportables**: 10 reportes en PDF y Excel.
- **Diseño responsive**: Tablas que se adaptan a móvil y tablet.
- **Multiempresa**: Aislamiento de datos por empresa según el rol.

---

## Licencia

Uso interno — TrazaFuel
