import { api, type ApiClient } from './client';
import type { AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest } from './types';

export type AuthApi = {
  login: (request: LoginRequest) => Promise<AuthResponse>;
  register: (request: RegisterRequest) => Promise<AuthResponse>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
};

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    login: (request) =>
      client.request<AuthResponse>('/auth/login', { method: 'POST', body: request }),

    register: (request) =>
      client.request<AuthResponse>('/auth/register', { method: 'POST', body: request }),

    changePassword: (request) =>
      client.request<void>('/auth/password', { method: 'PUT', body: request, auth: true }),
  };
}

export const authApi = createAuthApi(api);
