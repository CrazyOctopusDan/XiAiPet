declare const wx: any;

export interface BootstrapResponse {
  ok: boolean;
  operation: 'create' | 'restore';
  user: Record<string, unknown>;
}

export async function startCustomerBootstrap(): Promise<BootstrapResponse> {
  const loginResult = await wx.login();

  const response = (await wx.cloud.callFunction({
    name: 'bootstrapUser',
    data: {
      code: loginResult.code
    }
  })) as { result: BootstrapResponse };

  return response.result;
}
