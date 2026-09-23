import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  let component: AccessDeniedComponent;
  let fixture: ComponentFixture<AccessDeniedComponent>;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    navigateSpy = jasmine.createSpy('navigate');

    await TestBed.configureTestingModule({
      imports: [AccessDeniedComponent],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccessDeniedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the forbidden title from i18n', () => {
    const title = fixture.nativeElement.querySelector('.title');

    expect(title.textContent.trim()).toBe('ACCESS_DENIED.TITLE');
  });

  it('should navigate to sales on goHome', () => {
    component.goHome();

    expect(navigateSpy).toHaveBeenCalledWith(['/sales']);
  });
});