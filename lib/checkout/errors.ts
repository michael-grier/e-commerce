export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 500,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
