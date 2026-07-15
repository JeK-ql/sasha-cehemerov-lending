type WayforpayCallback = (response: unknown) => void;
interface WayforpayInstance {
  // Inline-віджет: після оплати кидає JS-події (approved/declined/pending),
  // а не редіректить сторінку — тому результат ловимо колбеками.
  run(
    params: Record<string, unknown>,
    onApproved?: WayforpayCallback,
    onDeclined?: WayforpayCallback,
    onPending?: WayforpayCallback,
  ): void;
}
interface Window {
  Wayforpay?: new () => WayforpayInstance;
}
