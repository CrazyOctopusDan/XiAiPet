import { customerApiRequest, type CustomerApiRequester } from './api-client';

export interface BootstrapResponse {
  ok: boolean;
  operation: 'create' | 'restore';
  user: Record<string, unknown>;
}

export async function startCustomerBootstrap(
  request: CustomerApiRequester = customerApiRequest
): Promise<BootstrapResponse> {
  return request<BootstrapResponse>('/api/v1/customer/bootstrap', {
    method: 'POST',
    auth: 'customer'
  });
}
