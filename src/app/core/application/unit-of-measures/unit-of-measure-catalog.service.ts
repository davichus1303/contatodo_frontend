import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { UnitOfMeasure } from '../../domain/models/unit-of-measure.model';
import { UnitOfMeasureService } from './unit-of-measure.service';

/**
 * Shared read facade for the unit of measure catalog.
 *
 * <p>Modules that only need to populate a selector or resolve historical names
 * should depend on this facade instead of calling the transport service
 * directly. It keeps both use cases explicit:</p>
 *
 * <ul>
 *   <li>active units for create/edit selectors;</li>
 *   <li>non-deleted units for displaying names of historical records.</li>
 * </ul>
 *
 * <p>The underlying reads are cached per company by
 * {@link UnitOfMeasureService}, so repeated consumers of the same company do
 * not repeat the HTTP request.</p>
 */
@Injectable({
  providedIn: 'root'
})
export class UnitOfMeasureCatalogService {
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);

  /**
   * Retrieves the active units of measure of a company.
   *
   * @param companyOid Company identifier, or undefined to use the session company.
   * @returns Observable with the active units.
   */
  getActiveUnits(companyOid?: string): Observable<UnitOfMeasure[]> {
    return this.unitOfMeasureService
      .getUnitOfMeasures(companyOid)
      .pipe(map((response) => response.data ?? []));
  }

  /**
   * Retrieves the non-deleted units of measure of a company.
   *
   * <p>This is the correct source for resolving names of historical records:
   * a unit may have been deactivated after the record was created.</p>
   *
   * @param companyOid Company identifier, or undefined to use the session company.
   * @returns Observable with the non-deleted units.
   */
  getHistoricalUnits(companyOid?: string): Observable<UnitOfMeasure[]> {
    return this.unitOfMeasureService
      .getAllNotDeletedUnitOfMeasures(companyOid)
      .pipe(map((response) => response.data ?? []));
  }

  /**
   * Resolves unit of measure identifiers to names, emulating an inner join.
   *
   * <p>Only identifiers present in the selected catalog appear in the result;
   * duplicates are collapsed and blank identifiers are ignored. Callers can
   * therefore render the returned map without extra null checks.</p>
   *
   * @param oids Unit of measure identifiers to resolve.
   * @param companyOid Company identifier, or undefined to use the session company.
   * @param includeInactive When true, resolves against non-deleted units so
   * historical records keep their names after a unit is deactivated.
   * @returns Observable with the resolved `oid -> name` map.
   */
  resolveNames(
    oids: readonly string[],
    companyOid?: string,
    includeInactive = false
  ): Observable<ReadonlyMap<string, string>> {
    const uniqueOids = Array.from(
      new Set(oids.filter((oid) => typeof oid === 'string' && oid.length > 0))
    );

    if (uniqueOids.length === 0) {
      return of(new Map<string, string>());
    }

    const source = includeInactive
      ? this.getHistoricalUnits(companyOid)
      : this.getActiveUnits(companyOid);

    return source.pipe(
      map((units) => {
        const namesByOid = new Map(units.map((unit) => [unit.id, unit.name] as const));
        const resolved = new Map<string, string>();

        for (const oid of uniqueOids) {
          const name = namesByOid.get(oid);
          if (name !== undefined) {
            resolved.set(oid, name);
          }
        }

        return resolved;
      })
    );
  }

  /**
   * Clears the cached catalog entries.
   *
   * @param companyOid Company whose entries must be evicted, or undefined for all.
   */
  invalidateCache(companyOid?: string): void {
    this.unitOfMeasureService.invalidateCache(companyOid);
  }
}
