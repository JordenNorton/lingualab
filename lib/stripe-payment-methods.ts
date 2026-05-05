import "server-only";

import Stripe from "stripe";

function paymentMethodId(paymentMethod: string | Stripe.PaymentMethod | null | undefined) {
  return typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id ?? null;
}

function isDeletedCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): customer is Stripe.DeletedCustomer {
  return "deleted" in customer && customer.deleted === true;
}

async function allowCheckoutRedisplay(stripe: Stripe, paymentMethodId: string) {
  try {
    await stripe.paymentMethods.update(paymentMethodId, {
      allow_redisplay: "always"
    });
  } catch (error) {
    console.warn("Stripe payment method redisplay could not be updated", error);
  }
}

export async function ensureCustomerDefaultPaymentMethod(stripe: Stripe, customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if (isDeletedCustomer(customer)) return null;

    const existingDefaultPaymentMethodId = paymentMethodId(customer.invoice_settings.default_payment_method);

    if (existingDefaultPaymentMethodId) {
      await allowCheckoutRedisplay(stripe, existingDefaultPaymentMethodId);
      return existingDefaultPaymentMethodId;
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1
    });
    const cardPaymentMethodId = paymentMethods.data[0]?.id ?? null;

    if (!cardPaymentMethodId) return null;

    await allowCheckoutRedisplay(stripe, cardPaymentMethodId);
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: cardPaymentMethodId
      }
    });

    return cardPaymentMethodId;
  } catch (error) {
    console.warn("Stripe customer default payment method could not be prepared", error);
    return null;
  }
}

export async function ensureSubscriptionDefaultPaymentMethod(stripe: Stripe, customerId: string, subscriptionId: string) {
  const defaultPaymentMethodId = await ensureCustomerDefaultPaymentMethod(stripe, customerId);

  try {
    await stripe.subscriptions.update(subscriptionId, {
      ...(defaultPaymentMethodId ? { default_payment_method: defaultPaymentMethodId } : {}),
      payment_settings: {
        save_default_payment_method: "on_subscription"
      }
    });
  } catch (error) {
    console.warn("Stripe subscription default payment method could not be prepared", error);
  }

  return defaultPaymentMethodId;
}
