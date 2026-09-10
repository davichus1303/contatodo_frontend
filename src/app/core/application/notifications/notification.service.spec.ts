import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarOpenSpy: jasmine.Spy;

  beforeEach(() => {
    snackBarOpenSpy = jasmine.createSpy('open');

    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: { open: snackBarOpenSpy } }
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open the snackbar with the shared default configuration', () => {
    service.success('todo bien');

    expect(snackBarOpenSpy).toHaveBeenCalledWith(
      'todo bien',
      GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
      { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
    );
  });

  it('should use the same configuration for errors', () => {
    service.error('algo falló');

    expect(snackBarOpenSpy).toHaveBeenCalledWith(
      'algo falló',
      GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
      { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
    );
  });
});
