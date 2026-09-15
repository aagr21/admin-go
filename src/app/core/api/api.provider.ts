import { Provider } from '@angular/core';
import { AdminGoApi } from './admin-go.api';
import { InMemoryAdminGoApi } from './in-memory-admin-go.api';

/**
 * Punto único de sustitución del origen de datos (§29, §31).
 *
 * Mientras no exista backend se inyecta `InMemoryAdminGoApi`. El día que lo
 * haya, basta con implementar `HttpAdminGoApi extends AdminGoApi` —con
 * `HttpClient` y las rutas ya documentadas en el contrato— y cambiar esta
 * función. Ninguna pantalla necesita enterarse.
 */
export function provideAdminGoApi(): Provider {
  return { provide: AdminGoApi, useClass: InMemoryAdminGoApi };
}
