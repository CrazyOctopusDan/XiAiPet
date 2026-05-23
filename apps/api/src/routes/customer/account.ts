import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function customerAccountRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const customerGuard = { preHandler: dependencies.guards.requireCustomerSession };

  app.get('/addresses', customerGuard, async (request) => {
    const query = request.query as { type?: 'city' | 'express' } | undefined;
    return dependencies.customerAccountService.listAddresses(request.auth?.openid ?? '', {
      type: query?.type
    });
  });

  app.post('/addresses', customerGuard, async (request) => {
    return dependencies.customerAccountService.createAddress(request.auth?.openid ?? '', request.body);
  });

  app.put('/addresses/:addressId', customerGuard, async (request) => {
    const params = request.params as { addressId: string };
    return dependencies.customerAccountService.updateAddress(request.auth?.openid ?? '', params.addressId, request.body);
  });

  app.put('/addresses/:addressId/default', customerGuard, async (request) => {
    const params = request.params as { addressId: string };
    return dependencies.customerAccountService.setDefaultAddress(request.auth?.openid ?? '', params.addressId);
  });

  app.get('/pets', customerGuard, async (request) => {
    return dependencies.customerAccountService.listPets(request.auth?.openid ?? '');
  });

  app.post('/pets', customerGuard, async (request) => {
    return dependencies.customerAccountService.createPet(request.auth?.openid ?? '', request.body);
  });

  app.put('/pets/:petId', customerGuard, async (request) => {
    const params = request.params as { petId: string };
    return dependencies.customerAccountService.updatePet(request.auth?.openid ?? '', params.petId, request.body);
  });

  app.get('/balance', customerGuard, async (request) => {
    const query = request.query as { cursor?: string; limit?: string } | undefined;
    return dependencies.customerAccountService.getBalance(request.auth?.openid ?? '', query);
  });
}
