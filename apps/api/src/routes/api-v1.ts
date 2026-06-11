import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from './dependencies';
import { customerAuthRoutes } from './customer/auth';
import { customerAccountRoutes } from './customer/account';
import { customerProfileRoutes } from './customer/profile';
import { customerCatalogRoutes } from './customer/catalog';
import { customerOrderRoutes } from './customer/orders';
import { customerRuntimeConfigRoutes } from './customer/runtime-config';
import { merchantAccountRoutes } from './merchant/accounts';
import { merchantAuthRoutes } from './merchant/auth';
import { merchantAssetRoutes } from './merchant/assets';
import { merchantCatalogRoutes } from './merchant/catalog';
import { merchantOrderRoutes } from './merchant/orders';
import { merchantPrintingRoutes } from './merchant/printing';
import { merchantRuntimeConfigRoutes } from './merchant/runtime-config';
import { merchantUserRoutes } from './merchant/users';
import { paymentRoutes } from './payments';

export async function apiV1Routes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  await app.register(customerAuthRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(customerAccountRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(customerProfileRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(customerCatalogRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(customerRuntimeConfigRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(customerOrderRoutes, { prefix: '/api/v1/customer', dependencies });
  await app.register(paymentRoutes, { prefix: '/api/v1/payments', dependencies });
  await app.register(merchantAuthRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantAccountRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantAssetRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantOrderRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantCatalogRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantUserRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantRuntimeConfigRoutes, { prefix: '/api/v1/merchant', dependencies });
  await app.register(merchantPrintingRoutes, { prefix: '/api/v1/merchant', dependencies });
}
