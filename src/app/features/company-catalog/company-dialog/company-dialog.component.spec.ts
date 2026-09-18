import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CompanyDialogComponent, CompanyDialogData } from './company-dialog.component';
import { I18nService } from '@core/i18n/i18n.service';
import { Company } from '@core/domain/models/company.model';
import { User } from '@core/domain/models/user.model';
import { CompanyFormModel } from './company-form.model';

describe('CompanyDialogComponent', () => {
  let component: CompanyDialogComponent;
  let fixture: ComponentFixture<CompanyDialogComponent>;
  let formSubmitSpy: jasmine.Spy;
  let closeSpy: jasmine.Spy;

  const users: User[] = [
    {
      id: 'u1', userName: 'ana', email: 'ana@example.com', name: 'Ana',
      phoneNumber: '111', createdDate: '', updatedDate: '', active: true
    },
    {
      id: 'u2', userName: 'bob', email: 'bob@example.com', name: 'Bob',
      phoneNumber: null, createdDate: '', updatedDate: '', active: true
    }
  ];

  const company: Company = {
    id: 'c1',
    name: 'Acme',
    rfc: '',
    webSite: 'https://acme.example.com',
    ubication: 'Lima',
    contactUserOId: 'u1',
    contactName: 'Ana',
    contactPhone: '111',
    isActive: true,
    isDeleted: false
  };

  function configure(data: CompanyDialogData): void {
    TestBed.configureTestingModule({
      imports: [CompanyDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(CompanyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.formSubmit.subscribe(formSubmitSpy);
  }

  beforeEach(() => {
    formSubmitSpy = jasmine.createSpy('formSubmit');
    closeSpy = jasmine.createSpy('close');
  });

  describe('in create mode', () => {
    beforeEach(() => {
      configure({ mode: 'create', users });
    });

    it('should create and expose the provided contacts', () => {
      expect(component).toBeTruthy();
      expect(component.users.length).toBe(2);
    });

    it('should not emit when the name is blank', () => {
      component.form.controls.name.setValue('   ');

      component.submit();

      expect(formSubmitSpy).not.toHaveBeenCalled();
      expect(component.isSaving()).toBeFalse();
    });

    it('should fill and lock the phone when the selected contact has one', () => {
      component.onContactChange('u1');

      expect(component.form.controls.phoneNumber.value).toBe('111');
      expect(component.isPhoneLocked()).toBeTrue();
    });

    it('should clear and unlock the phone when the selected contact has none', () => {
      component.onContactChange('u2');

      expect(component.form.controls.phoneNumber.value).toBe('');
      expect(component.isPhoneLocked()).toBeFalse();
    });

    it('should emit the raw form view model on submit', () => {
      component.form.controls.name.setValue('  Acme  ');
      component.form.controls.webSite.setValue('https://acme.example.com');
      component.form.controls.ubication.setValue('Lima');
      component.onContactChange('u1');

      component.submit();

      const expected: CompanyFormModel = {
        name: '  Acme  ',
        webSite: 'https://acme.example.com',
        ubication: 'Lima',
        contactUserOId: 'u1',
        phoneNumber: '111'
      };
      expect(formSubmitSpy).toHaveBeenCalledWith(expected);
      expect(component.isSaving()).toBeTrue();
    });

    it('should ignore further submits while a save is in progress', () => {
      component.form.controls.name.setValue('Acme');

      component.submit();
      component.submit();

      expect(formSubmitSpy).toHaveBeenCalledTimes(1);
    });

    it('should close discarding the written values when cancelled', () => {
      component.form.controls.name.setValue('Acme');

      component.cancel();

      expect(closeSpy).toHaveBeenCalled();
      expect(formSubmitSpy).not.toHaveBeenCalled();
    });
  });

  describe('in edit mode', () => {
    beforeEach(() => {
      configure({ mode: 'edit', users, company });
    });

    it('should prefill the form from the provided company', () => {
      expect(component.form.controls.name.value).toBe('Acme');
      expect(component.form.controls.webSite.value).toBe('https://acme.example.com');
      expect(component.form.controls.ubication.value).toBe('Lima');
      expect(component.form.controls.contactUserOId.value).toBe('u1');
      expect(component.form.controls.phoneNumber.value).toBe('111');
      expect(component.isPhoneLocked()).toBeTrue();
    });
  });
});
