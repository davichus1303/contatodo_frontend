import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PermissionDirective } from './permission.directive';
import { PermissionService } from '@core/application/permissions/permission.service';

@Component({
  template: `
    <button *appPermission="'/products'; action: 'create'" class="guarded">Create</button>
    <button *appPermission="'/products'" class="default-view">View</button>
  `,
  imports: [PermissionDirective],
  standalone: true
})
class HostComponent {}

describe('PermissionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let hasAccessSpy: jasmine.Spy;

  beforeEach(() => {
    hasAccessSpy = jasmine.createSpy('hasAccessByLink');

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: PermissionService, useValue: { hasAccessByLink: hasAccessSpy } }
      ]
    });

    hasAccessSpy.calls.reset();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('should render the protected content when the user holds the permission', () => {
    hasAccessSpy.and.returnValue(of(true));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.guarded')).toBeTruthy();
    expect(element.querySelector('.default-view')).toBeTruthy();
    expect(hasAccessSpy).toHaveBeenCalledWith('/products', 'create');
    expect(hasAccessSpy).toHaveBeenCalledWith('/products', 'view');
  });

  it('should remove the protected content when the user lacks the permission', () => {
    hasAccessSpy.and.returnValue(of(false));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.guarded')).toBeNull();
    expect(element.querySelector('.default-view')).toBeNull();
  });
});