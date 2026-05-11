import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from '../dependencies';

export async function merchantPrintingRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;
  const merchantGuard = { preHandler: dependencies.guards.requireMerchantSession };

  app.post('/orders/:orderId/receipt-print/prepare', merchantGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.printingService.prepareOrderReceiptPrint(request.merchant, params.orderId, request.body);
  });

  app.post('/orders/:orderId/receipt-print/result', merchantGuard, async (request) => {
    const params = request.params as { orderId: string };
    return dependencies.printingService.recordOrderReceiptPrintResult(request.merchant, params.orderId, request.body);
  });
}
