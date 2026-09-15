/** Definición de la navegación lateral agrupada por dominio (§7). */
export interface NavItem {
  label: string;
  path: string;
  /** Ruta SVG (Material, viewBox 0 0 24 24) del icono del menú. */
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Torre de control',
    items: [
      {
        label: 'Control Tower',
        path: '/dashboard',
        icon: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
      },
    ],
  },
  {
    label: 'Operación',
    items: [
      {
        label: 'Operaciones',
        path: '/operations',
        icon: 'M3 12l4-4v3h10v2H7v3zM21 12l-4 4v-3H7v-2h10V8z',
      },
      {
        label: 'Control operativo',
        path: '/controls',
        icon: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
      },
      { label: 'Plantas', path: '/plants', icon: 'M3 20V8l5 3V8l5 3V4h3v16z' },
      { label: 'Estaciones', path: '/stations', icon: 'M5 20V6h2v14zM9 6h9v3H9zM9 11h9v9H9z' },
      { label: 'Tanques', path: '/tanks', icon: 'M4 4h16v16H4zM7 8h10v2H7z' },
      { label: 'Cisternas', path: '/cisterns', icon: 'M2 7h11v8H2zM13 9h4l3 3v3h-7z' },
    ],
  },
  {
    label: 'Documental',
    items: [
      { label: 'Documentos', path: '/documents', icon: 'M6 2h8l4 4v16H6z' },
      {
        label: 'Cumplimiento',
        path: '/compliance',
        icon: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zM10.5 15 8 12.5l1.4-1.4 1.1 1.1 3.1-3.1L15 10.5z',
      },
      {
        label: 'Declaraciones',
        path: '/declarations',
        icon: 'M4 6h14v2H4zM4 11h14v2H4zM4 16h9v2H4z',
      },
    ],
  },
  {
    label: 'Control',
    items: [
      { label: 'Volúmenes', path: '/volumes', icon: 'M4 18h3v-6H4zM9 18h3V8H9zM14 18h3V4h-3z' },
      {
        label: 'Producto y calidad',
        path: '/quality',
        icon: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
      },
      { label: 'Alertas', path: '/alerts', icon: 'M12 3l10 18H2zM11 9h2v5h-2zM11 16h2v2h-2z' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Empresas', path: '/companies', icon: 'M3 3h8v18H3zM13 8h8v13h-8z' },
      {
        label: 'Usuarios y roles',
        path: '/users',
        icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z',
      },
      { label: 'Reportes', path: '/reports', icon: 'M4 4h16v16H4zM7 8h10v2H7zM7 12h10v2H7z' },
      {
        label: 'Auditoría',
        path: '/audit',
        icon: 'M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6v3l4-4-4-4zM11 9h2v8h-2z',
      },
      {
        label: 'Configuración',
        path: '/settings',
        icon: 'M12 2l2 3h3l1 3-2 2 2 2-1 3h-3l-2 3-2-3H7l-1-3 2-2-2-2 1-3h3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
      },
    ],
  },
];
