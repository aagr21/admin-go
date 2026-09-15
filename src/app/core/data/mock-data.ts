import {
  AgDocument,
  Company,
  Cistern,
  Driver,
  Operation,
  Plant,
  Product,
  Requirement,
  Station,
  Tank,
  User,
} from '@core/models/entities';
import { PlantStatus } from '@core/models/enums';

/**
 * Dataset de demostración para el MVP de la Torre de Control (§9, §12, §15, §25).
 * En producción estos datos vendrán del backend/API (ver §30, §31).
 */

const pad = (n: number, size = 2): string => String(n).padStart(size, '0');

/* ── Empresas (§7) ───────────────────────────────────────────────── */
export const COMPANIES: Company[] = [
  // AdminGo es también una empresa: su personal pertenece a ella (§6).
  {
    id: 'cmp-0',
    name: 'AdminGo',
    nit: '1023456000',
    kind: 'Operador',
    contactName: 'Arnol Guevara',
    contactEmail: 'admin@admingo.bo',
    active: true,
  },
  {
    id: 'cmp-1',
    name: 'Andina Petrol Import S.A.',
    nit: '1023456011',
    kind: 'Importador',
    contactName: 'Marcela Rojas',
    contactEmail: 'mrojas@andinapetrol.bo',
    active: true,
  },
  {
    id: 'cmp-2',
    name: 'Transportes del Sur Ltda.',
    nit: '1023456022',
    kind: 'Transportista',
    contactName: 'Julio Ferrufino',
    contactEmail: 'operaciones@transsur.bo',
    active: true,
  },
  {
    id: 'cmp-3',
    name: 'Estación Central 24h S.R.L.',
    nit: '1023456033',
    kind: 'Estación de servicio',
    contactName: 'Ana Villarroel',
    contactEmail: 'gerencia@central24.bo',
    active: true,
  },
  {
    id: 'cmp-4',
    name: 'Red Oriente de Combustibles',
    nit: '1023456044',
    kind: 'Estación de servicio',
    contactName: 'Luis Suárez',
    contactEmail: 'contacto@redoriente.bo',
    active: true,
  },
];

export const PRODUCTS: Product[] = [
  { id: 'prd-1', code: 'DI', name: 'Diésel Importado', unit: 'L' },
  { id: 'prd-2', code: 'GE', name: 'Gasolina Especial', unit: 'L' },
  { id: 'prd-3', code: 'GP', name: 'Gasolina Premium', unit: 'L' },
  { id: 'prd-4', code: 'JF', name: 'Jet Fuel', unit: 'L' },
];

/* ── Red de 16 plantas (§9) ──────────────────────────────────────── */
type PlantSeed = [
  code: string,
  name: string,
  city: string,
  dept: string,
  status: PlantStatus,
  score: number,
];

const PLANT_SEEDS: PlantSeed[] = [
  ['PL-CBB', 'Planta Cochabamba', 'Cochabamba', 'Cochabamba', 'green', 94],
  ['PL-SCZ', 'Planta Santa Cruz', 'Santa Cruz de la Sierra', 'Santa Cruz', 'green', 91],
  ['PL-LPB', 'Planta La Paz', 'El Alto', 'La Paz', 'yellow', 82],
  ['PL-ORU', 'Planta Oruro', 'Oruro', 'Oruro', 'green', 88],
  ['PL-PTS', 'Planta Potosí', 'Potosí', 'Potosí', 'red', 61],
  ['PL-CHQ', 'Planta Sucre', 'Sucre', 'Chuquisaca', 'green', 90],
  ['PL-TJA', 'Planta Tarija', 'Tarija', 'Tarija', 'green', 93],
  ['PL-TDD', 'Planta Trinidad', 'Trinidad', 'Beni', 'yellow', 79],
  ['PL-YAC', 'Planta Yacuiba', 'Yacuiba', 'Tarija', 'green', 87],
  ['PL-VIL', 'Planta Villazón', 'Villazón', 'Potosí', 'yellow', 76],
  ['PL-BER', 'Planta Bermejo', 'Bermejo', 'Tarija', 'green', 89],
  ['PL-CAM', 'Planta Camiri', 'Camiri', 'Santa Cruz', 'green', 86],
  ['PL-MON', 'Planta Montero', 'Montero', 'Santa Cruz', 'yellow', 81],
  ['PL-RIB', 'Planta Riberalta', 'Riberalta', 'Beni', 'red', 58],
  ['PL-CBJ', 'Planta Cobija', 'Cobija', 'Pando', 'green', 85],
  ['PL-UYU', 'Planta Uyuni', 'Uyuni', 'Potosí', 'yellow', 74],
];

export const PLANTS: Plant[] = PLANT_SEEDS.map(
  ([code, name, city, department, status, adminScore], i) => {
    const availableVolume = 820_000 + i * 37_500;
    const receivedToday = 45_000 + ((i * 7) % 5) * 8_200;
    const dispatchedToday = 32_000 + ((i * 5) % 6) * 7_400;
    const theoreticalBalance = availableVolume + receivedToday - dispatchedToday;
    const drift = (i % 3 === 0 ? 1 : -1) * (i % 4) * 320;
    return {
      id: `plt-${i + 1}`,
      code,
      name,
      city,
      department,
      status,
      adminScore,
      products: ['Diésel Importado', 'Gasolina Especial'],
      availableVolume,
      receivedToday,
      dispatchedToday,
      theoreticalBalance,
      physicalBalance: theoreticalBalance + drift,
      openOperations: (i % 4) + 1,
      cisternsInside: (i * 3) % 7,
      lastControlAt: `2026-09-${pad(10 + (i % 5))}T${pad(7 + (i % 10))}:30:00`,
    };
  },
);

/* ── Estaciones de servicio (§20) ────────────────────────────────── */
type StationSeed = [
  code: string,
  name: string,
  companyId: string,
  city: string,
  manager: string,
  status: PlantStatus,
];

const STATION_SEEDS: StationSeed[] = [
  ['EESS-001', 'Estación Central 24h', 'cmp-3', 'Cochabamba', 'Ana Villarroel', 'green'],
  ['EESS-002', 'Servicentro Km 7', 'cmp-4', 'Santa Cruz de la Sierra', 'Marco Peña', 'green'],
  ['EESS-003', 'EESS El Alto Norte', 'cmp-3', 'El Alto', 'Rita Condori', 'yellow'],
  ['EESS-004', 'Combustibles Sur', 'cmp-4', 'Tarija', 'Hugo Méndez', 'green'],
  ['EESS-005', 'Servicentro Trinidad', 'cmp-4', 'Trinidad', 'Paola Ruiz', 'red'],
];

export const STATIONS: Station[] = STATION_SEEDS.map(
  ([code, name, companyId, city, manager, status], i) => ({
    id: `stn-${i + 1}`,
    code,
    name,
    companyId,
    city,
    manager,
    products: i % 2 === 0 ? ['Diésel Importado'] : ['Diésel Importado', 'Gasolina Especial'],
    tanks: 3,
    capacity: 150_000 + i * 20_000,
    inventory: 120_000 + i * 18_000,
    receivedToday: 28_000 + i * 4_100,
    dispatchedToday: 19_000 + i * 3_700,
    status,
    documentStatus:
      i === 4
        ? ('Vencido' as const)
        : i === 2
          ? ('Próximo a vencer' as const)
          : ('Vigente' as const),
  }),
);

/* ── Tanques (§21) ───────────────────────────────────────────────── */
export const TANKS: Tank[] = Array.from({ length: 10 }, (_, i) => {
  const capacity = 60_000 + (i % 3) * 20_000;
  const physicalVolume = Math.round(capacity * (0.55 + (i % 5) * 0.07));
  const theoreticalVolume = physicalVolume + (i % 2 === 0 ? 180 : -140);
  return {
    id: `tnk-${i + 1}`,
    code: `TK-${pad(i + 1)}`,
    stationId: STATIONS[i % STATIONS.length].id,
    product: PRODUCTS[i % 2 === 0 ? 0 : 1].name,
    capacity,
    physicalVolume,
    theoreticalVolume,
    status: i % 4 === 0 ? 'yellow' : 'green',
    lastMeasuredAt: `2026-09-${pad(11 + (i % 3))}T08:15:00`,
  };
});

/* ── Conductores y cisternas (§19) ──────────────────────────────── */
type DriverSeed = [fullName: string, license: string];

const DRIVER_SEEDS: DriverSeed[] = [
  ['Juan Quispe', 'LIC-772341'],
  ['Pedro Mamani', 'LIC-772342'],
  ['Carlos Ibáñez', 'LIC-772343'],
  ['María Gutiérrez', 'LIC-772344'],
  ['Sergio Álvarez', 'LIC-772345'],
  ['Daniel Choque', 'LIC-772346'],
];

export const DRIVERS: Driver[] = DRIVER_SEEDS.map(([fullName, license], i) => ({
  id: `drv-${i + 1}`,
  fullName,
  license,
  phone: `7${1000000 + i * 12345}`,
  companyId: 'cmp-2',
  active: true,
}));

type CisternSeed = [plate: string, docStatus: Cistern['documentStatus'], status: Cistern['status']];

const CISTERN_SEEDS: CisternSeed[] = [
  ['CIS-1123-ABC', 'Vigente', 'En ruta'],
  ['CIS-4301-XYZ', 'Vigente', 'En planta'],
  ['CIS-7788-QWE', 'Vigente', 'Disponible'],
  ['CIS-9021-RTY', 'Próximo a vencer', 'En ruta'],
  ['CIS-3344-ASD', 'Vigente', 'Disponible'],
  ['CIS-5566-FGH', 'Vencido', 'Mantenimiento'],
  ['CIS-8899-JKL', 'Vigente', 'En ruta'],
  ['CIS-2211-ZXC', 'Vigente', 'En planta'],
];

export const CISTERNS: Cistern[] = CISTERN_SEEDS.map(([plate, documentStatus, status], i) => ({
  id: `cis-${i + 1}`,
  plate,
  companyId: 'cmp-2',
  driverId: DRIVERS[i % DRIVERS.length].id,
  capacity: 32_000 + (i % 3) * 4_000,
  sealCodes: [`PRC-${4000 + i}`, `PRC-${5000 + i}`],
  status,
  documentStatus,
  operationsCount: 12 + i * 3,
}));

/* ── Requisitos de la matriz de cumplimiento (§16) ──────────────── */
type RequirementSeed = [
  code: string,
  name: string,
  appliesTo: Requirement['appliesTo'],
  mandatory: boolean,
  validityDays: number,
];

const REQUIREMENT_SEEDS: RequirementSeed[] = [
  ['REQ-DI-01', 'Autorización de importación de diésel', 'cliente', true, 365],
  ['REQ-DI-02', 'Certificado de calidad del lote', 'actividad', true, 180],
  ['REQ-VEH-01', 'Póliza de seguro de cisterna', 'vehículo', true, 365],
  ['REQ-VEH-02', 'Habilitación técnica del vehículo', 'vehículo', true, 365],
  ['REQ-INS-01', 'Registro de planta de almacenamiento', 'instalación', true, 730],
  ['REQ-OPE-01', 'Planilla de despacho firmada', 'actividad', false, 90],
];

/** Tipos de cliente a los que aplica cada tipo de requisito (§16). */
const CLIENT_KINDS_BY_SCOPE: Record<Requirement['appliesTo'], Company['kind'][]> = {
  cliente: [],
  actividad: [],
  vehículo: ['Transportista'],
  instalación: ['Estación de servicio', 'Operador'],
};

export const REQUIREMENTS: Requirement[] = REQUIREMENT_SEEDS.map(
  ([code, name, appliesTo, mandatory, validityDays], i) => ({
    id: `req-${i + 1}`,
    code,
    name,
    appliesTo,
    mandatory,
    validityDays,
    clientKinds: CLIENT_KINDS_BY_SCOPE[appliesTo],
    active: true,
  }),
);

/* ── Usuarios (§6) ──────────────────────────────────────────────── */
type UserSeed = [username: string, fullName: string, role: User['role'], companyId: string];

const USER_SEEDS: UserSeed[] = [
  ['admin', 'Arnol Guevara', 'Superadministrador AdminGo', 'cmp-0'],
  ['mrojas', 'Marcela Rojas', 'Administrador cliente', 'cmp-1'],
  ['gerente.andina', 'Verónica Paz', 'Gerente', 'cmp-1'],
  ['regulatorio.andina', 'Iván Terceros', 'Responsable regulatorio', 'cmp-1'],
  ['sup.campo01', 'Ramiro Loza', 'Supervisor operativo AdminGo', 'cmp-0'],
  ['operador01', 'Nicolás Vargas', 'Operador de campo', 'cmp-0'],
  ['eess.central', 'Ana Villarroel', 'Responsable EESS', 'cmp-3'],
  ['auditor.01', 'Silvia Camacho', 'Auditor', 'cmp-1'],
];

export const USERS: User[] = USER_SEEDS.map(([username, fullName, role, companyId], i) => ({
  id: `usr-${i + 1}`,
  username,
  fullName,
  email: `${username}@admingo.bo`,
  role,
  companyId,
  active: true,
}));

/* ── Operaciones (§12) ──────────────────────────────────────────── */
type OperationSeed = [
  type: Operation['type'],
  status: Operation['status'],
  product: string,
  origin: string,
  destination: string,
  plantIdx: number,
  stationIdx: number,
  cisternIdx: number,
  driverIdx: number,
  scheduledVolume: number,
  documentedVolume: number,
  receivedVolume: number,
];

const OPERATION_SEEDS: OperationSeed[] = [
  [
    'Recepción',
    'Cerrada',
    'Diésel Importado',
    'Aduana Pisiga',
    'Planta Oruro',
    3,
    -1,
    0,
    0,
    34000,
    34000,
    34000,
  ],
  [
    'Despacho',
    'En tránsito',
    'Diésel Importado',
    'Planta Cochabamba',
    'Estación Central 24h',
    0,
    0,
    1,
    1,
    28000,
    28000,
    0,
  ],
  [
    'Recepción',
    'Recibida',
    'Gasolina Especial',
    'Aduana Yacuiba',
    'Planta Yacuiba',
    8,
    -1,
    2,
    2,
    22000,
    22000,
    21960,
  ],
  [
    'Despacho',
    'Cerrada',
    'Diésel Importado',
    'Planta Santa Cruz',
    'Servicentro Km 7',
    1,
    1,
    3,
    3,
    32000,
    32000,
    31950,
  ],
  [
    'Traslado',
    'Observada',
    'Diésel Importado',
    'Planta Potosí',
    'Planta Uyuni',
    4,
    -1,
    4,
    4,
    18000,
    18000,
    17620,
  ],
  [
    'Venta',
    'Cerrada',
    'Gasolina Especial',
    'Planta Tarija',
    'Combustibles Sur',
    6,
    3,
    5,
    5,
    15000,
    15000,
    15000,
  ],
  [
    'Recepción',
    'Programada',
    'Diésel Importado',
    'Aduana Pisiga',
    'Planta La Paz',
    2,
    -1,
    6,
    0,
    40000,
    40000,
    0,
  ],
  [
    'Despacho',
    'Cerrada',
    'Diésel Importado',
    'Planta Trinidad',
    'Servicentro Trinidad',
    7,
    4,
    7,
    1,
    20000,
    20000,
    19870,
  ],
  [
    'Recepción',
    'Recibida',
    'Diésel Importado',
    'Aduana Bermejo',
    'Planta Bermejo',
    10,
    -1,
    0,
    2,
    26000,
    26000,
    25940,
  ],
  [
    'Ajuste',
    'Cerrada',
    'Diésel Importado',
    'Planta Riberalta',
    'Planta Riberalta',
    13,
    -1,
    1,
    3,
    900,
    900,
    900,
  ],
  [
    'Despacho',
    'Observada',
    'Gasolina Especial',
    'Planta Montero',
    'EESS El Alto Norte',
    12,
    2,
    2,
    4,
    17000,
    17000,
    16580,
  ],
  [
    'Traslado',
    'En tránsito',
    'Diésel Importado',
    'Planta Camiri',
    'Planta Santa Cruz',
    11,
    -1,
    3,
    5,
    24000,
    24000,
    0,
  ],
];

export const OPERATIONS: Operation[] = OPERATION_SEEDS.map((seed, i) => {
  const ops = seed;
  const seq = i + 1;
  const plant = PLANTS[ops[5]];
  const station = ops[6] >= 0 ? STATIONS[ops[6]] : null;
  const cistern = CISTERNS[ops[7]];
  const driver = DRIVERS[ops[8]];
  const day = pad(8 + (i % 8));
  return {
    id: `opn-${seq}`,
    code: `AG-DI-2026-${String(seq).padStart(6, '0')}`,
    type: ops[0],
    status: ops[1],
    product: ops[2],
    origin: ops[3],
    destination: ops[4],
    companyId: station ? station.companyId : 'cmp-1',
    scheduledVolume: ops[9],
    documentedVolume: ops[10],
    receivedVolume: ops[11],
    cisternPlate: cistern.plate,
    driverId: driver.id,
    driverName: driver.fullName,
    sealCodes: cistern.sealCodes,
    plantId: plant.id,
    stationId: station ? station.id : null,
    tankId: station ? TANKS[ops[6] % TANKS.length].id : null,
    documentIds: [`doc-${((seq * 2) % 14) + 1}`, `doc-${((seq * 3) % 14) + 1}`],
    evidenceIds: [`evd-${seq}`, `evd-${seq + 20}`],
    incidentIds: ops[1] === 'Observada' ? [`inc-${(seq % 5) + 1}`] : [],
    scheduledAt: `2026-09-${day}T${pad(6 + (i % 12))}:00:00`,
    updatedAt: `2026-09-${day}T${pad(8 + (i % 12))}:45:00`,
  };
});

/* ── Documentos (§15) ───────────────────────────────────────────── */
type DocumentSeed = [
  name: string,
  category: string,
  companyId: string,
  operationIdx: number,
  issuedAt: string,
  expiresAt: string | null,
  status: AgDocument['status'],
  stationIdx?: number,
];

const DOCUMENT_SEEDS: DocumentSeed[] = [
  [
    'Autorización de importación 2026',
    'Regulatorio',
    'cmp-1',
    -1,
    '2026-01-15',
    '2026-12-31',
    'Vigente',
  ],
  [
    'Certificado de calidad lote 8871',
    'Calidad',
    'cmp-1',
    0,
    '2026-08-02',
    '2026-10-05',
    'Próximo a vencer',
  ],
  ['Guía de tránsito AG-DI-000002', 'Operativo', 'cmp-1', 1, '2026-09-09', null, 'Vigente'],
  [
    'Póliza de seguro CIS-1123-ABC',
    'Vehículo',
    'cmp-2',
    -1,
    '2026-03-01',
    '2026-09-30',
    'Próximo a vencer',
  ],
  [
    'Habilitación técnica CIS-5566-FGH',
    'Vehículo',
    'cmp-2',
    -1,
    '2025-09-10',
    '2026-09-10',
    'Vencido',
  ],
  ['Registro de planta PL-PTS', 'Instalación', 'cmp-1', -1, '2025-05-20', '2027-05-20', 'Vigente'],
  ['Planilla de despacho 12/09', 'Operativo', 'cmp-1', 3, '2026-09-12', null, 'Vigente'],
  [
    'Certificado de calibración TK-04',
    'Instalación',
    'cmp-3',
    -1,
    '2026-02-14',
    '2026-11-14',
    'Vigente',
  ],
  [
    'Informe de control operativo PL-CBB',
    'Operativo',
    'cmp-1',
    -1,
    '2026-09-11',
    '2027-09-11',
    'Vigente',
  ],
  ['Manifiesto de carga AG-DI-000005', 'Operativo', 'cmp-2', 4, '2026-09-12', null, 'Observado'],
  ['Autorización EESS-005', 'Regulatorio', 'cmp-4', -1, '2024-08-01', '2026-08-01', 'Vencido', 4],
  [
    'Certificado ambiental planta TDD',
    'Ambiental',
    'cmp-1',
    -1,
    '2026-04-18',
    '2027-04-18',
    'Vigente',
  ],
  ['Requisito REQ-DI-02 sin respaldo', 'Calidad', 'cmp-1', -1, '2026-09-01', null, 'Faltante'],
  [
    'Contrato de servicio de control',
    'Comercial',
    'cmp-1',
    -1,
    '2026-01-02',
    '2026-12-31',
    'Vigente',
  ],
];

export const DOCUMENTS: AgDocument[] = DOCUMENT_SEEDS.map(
  ([name, category, companyId, operationIdx, issuedAt, expiresAt, status, stationIdx], i) => {
    const totalVersions = 1 + (i % 3);
    const responsible = i % 2 === 0 ? 'Iván Terceros' : 'Marcela Rojas';
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return {
      id: `doc-${i + 1}`,
      code: REQUIREMENTS[i % REQUIREMENTS.length].code,
      name,
      category,
      companyId,
      stationId: stationIdx === undefined ? null : STATIONS[stationIdx].id,
      operationId: operationIdx >= 0 ? OPERATIONS[operationIdx].id : null,
      issuedAt,
      expiresAt,
      status,
      responsible,
      versions: Array.from({ length: totalVersions }, (_, v) => ({
        version: v + 1,
        uploadedAt: `${issuedAt}T09:00:00`,
        uploadedBy: responsible,
        fileName: `${slug}-v${v + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 180_000 + v * 24_000,
        note: v === 0 ? 'Carga inicial del expediente.' : `Actualización v${v + 1}.`,
      })),
      observation: status === 'Observado' ? 'Falta firma del responsable de planta.' : null,
      evidenceIds: i % 4 === 0 ? [`evd-${i + 1}`] : [],
    } satisfies AgDocument;
  },
);
