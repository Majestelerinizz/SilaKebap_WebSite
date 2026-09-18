declare module "iyzipay" {
  type Callback<T> = (err: Error | null, result: T) => void;

  export default class Iyzipay {
    constructor(options: {
      apiKey: string;
      secretKey: string;
      uri: string;
    });
    checkoutFormInitialize: {
      create: (
        request: Record<string, unknown>,
        cb: Callback<Record<string, unknown>>,
      ) => void;
    };
    checkoutForm: {
      retrieve: (
        request: Record<string, unknown>,
        cb: Callback<Record<string, unknown>>,
      ) => void;
    };
  }
}
