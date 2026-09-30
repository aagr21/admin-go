import { Provider } from '@angular/core';
import { TrazaFuelApi } from './traza-fuel.api';
import { InMemoryTrazaFuelApi } from './in-memory-traza-fuel.api';

/**
 * Punto único de sustitución del origen de datos (§29, §31).
 *
 * Mientras no exista backend se inyecta `InMemoryTrazaFuelApi`. El día que lo
 * haya, basta con implementar `HttpTrazaFuelApi extends TrazaFuelApi` —con
 * `HttpClient` y las rutas ya documentadas en el contrato— y cambiar esta
 * función. Ninguna pantalla necesita enterarse.
 */
export function provideTrazaFuelApi(): Provider {
  return { provide: TrazaFuelApi, useClass: InMemoryTrazaFuelApi };
}
