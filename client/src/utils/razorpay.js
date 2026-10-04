function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(s);
  });
}

// Opens Razorpay checkout; resolves with the payload that must be verified by the backend.
export async function openCheckout({ order, user, name }) {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount * 100, currency: order.currency, order_id: order.orderId, name,
      prefill: { name: user.name, email: user.email, contact: user.phone },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rz.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    rz.open();
  });
}
