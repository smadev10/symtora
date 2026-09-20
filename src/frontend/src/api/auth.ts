import { api, type ApiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from './types';

export type AuthApi = {
  login: (request: LoginRequest) => Promise<AuthResponse>;
  register: (request: RegisterRequest) => Promise<AuthResponse>;
};

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    login: (request) =>
      client.request<AuthResponse>('/auth/login', { method: 'POST', body: request }),

    register: (request) =>
      client.request<AuthResponse>('/auth/register', { method: 'POST', body: request }),
  };
}

export const authApi = createAuthApi(api);
