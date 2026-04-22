declare const wx: any;

export async function verifyMerchantAccess() {
  return wx.cloud.callFunction({
    name: 'assertMerchantAccess',
    data: {}
  });
}
