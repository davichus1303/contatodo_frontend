import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UsersService } from './users.service';
import { HTTP_PORT } from '../ports/http.port';
import { User } from '../../domain/models/user.model';
import { UserRequest } from '../dto/user-request.dto';
import { USERS_URL } from '../../config/api-routes.constants';

describe('UsersService', () => {
  let service: UsersService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const rawUser = {
    id: ' u1 ',
    userName: ' ana ',
    email: 'ana@example.com',
    name: ' Ana ',
    phoneNumber: null,
    role: null,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    active: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(UsersService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should fetch all users and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawUser] }));

    let users: User[] = [];
    service.getUsers().subscribe((response) => (users = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(USERS_URL);
    expect(users[0].id).toBe('u1');
    expect(users[0].userName).toBe('ana');
    expect(users[0].phoneNumber).toBeUndefined();
  });

  it('should emit through the error channel when a user violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '', email: 'bad' }] }));

    let errored = false;
    service.getUsers().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });

  it('should create a user through a POST and map the response', () => {
    const request: UserRequest = {
      userName: 'ana',
      email: 'ana@example.com',
      name: 'Ana',
      roleId: 'r1',
      password: 'secret'
    };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawUser }));

    let user: User | undefined;
    service.createUser(request).subscribe((response) => (user = response.data));

    expect(httpMock.post).toHaveBeenCalledWith(USERS_URL, request);
    expect(user?.userName).toBe('ana');
  });

  it('should update a user through a PUT and map the response', () => {
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawUser }));

    service.updateUser('u1', { phoneNumber: '999' }).subscribe();

    expect(httpMock.put).toHaveBeenCalledWith(`${USERS_URL}/u1`, { phoneNumber: '999' });
  });

  it('should delete a user through DELETE without mapping the payload', () => {
    httpMock.delete.and.returnValue(of({ status: 200, message: 'OK', data: null }));

    service.deleteUser('u1').subscribe();

    expect(httpMock.delete).toHaveBeenCalledWith(`${USERS_URL}/u1`);
  });
});
