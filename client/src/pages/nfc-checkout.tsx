import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Truck,
  Shield,
  CheckCircle2,
  Star,
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Loader2,
  Package,
  Phone,
  Building2,
  MapPin,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/* ── Stripe promise (lazy-loaded once) ───────────────────────────────────── */
let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

/* ── Types ────────────────────────────────────────────────────────────────── */
interface OrderInfo {
  paymentIntentId: string;
  clientSecret: string;
  totalCents: number;
}

/* ── Province list (Spain) ────────────────────────────────────────────────── */
const PROVINCES = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona",
  "Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba",
  "Cuenca","Girona","Granada","Guadalajara","Guipúzcoa","Huelva","Huesca",
  "Illes Balears","Jaén","La Coruña","La Rioja","Las Palmas","León","Lleida",
  "Lugo","Madrid","Málaga","Murcia","Navarra","Orense","Palencia","Pontevedra",
  "Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona",
  "Teruel","Toledo","Valencia","Valladolid","Vizcaya","Zamora","Zaragoza",
];

/* ── Small input component ────────────────────────────────────────────────── */
function Field({
  label, name, type = "text", placeholder, value, onChange, required = false,
  autoComplete,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

/* ── Payment form (inside Elements) ──────────────────────────────────────── */
function CheckoutForm({
  paymentIntentId, totalCents,
}: {
  paymentIntentId: string; totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { language } = useLanguage();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", address: "", city: "", postalCode: "", province: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payReady, setPayReady] = useState(false);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const total = `${(totalCents / 100).toFixed(2).replace(".", ",")}€`;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setError(null);

      const { firstName, lastName, email, address, city, postalCode } = form;
      if (!firstName || !lastName || !email || !address || !city || !postalCode) {
        setError("Por favor completa todos los campos obligatorios.");
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        setError("Introduce una dirección de email válida.");
        return;
      }

      setSaving(true);
      try {
        // Save order info to our DB
        const saveRes = await fetch("/api/nfc-shop/save-order-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId, ...form }),
        });
        if (!saveRes.ok) {
          const j = await saveRes.json().catch(() => ({}));
          throw new Error(j.message || "Error al guardar los datos");
        }

        // Confirm payment via Stripe
        const returnUrl = `${window.location.origin}/${language}/nfc/order-success`;
        const { error: stripeError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
            payment_method_data: {
              billing_details: {
                name: `${firstName} ${lastName}`,
                email,
                phone: form.phone || undefined,
                address: {
                  line1: address,
                  city,
                  postal_code: postalCode,
                  state: form.province || undefined,
                  country: "ES",
                },
              },
            },
          },
        });

        if (stripeError) {
          setError(stripeError.message || "Error al procesar el pago.");
        }
      } catch (err: any) {
        setError(err.message || "Error inesperado. Inténtalo de nuevo.");
      } finally {
        setSaving(false);
      }
    },
    [stripe, elements, form, paymentIntentId, language]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal info */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
          Datos personales
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" name="firstName" value={form.firstName} onChange={set("firstName")} required autoComplete="given-name" />
          <Field label="Apellidos" name="lastName" value={form.lastName} onChange={set("lastName")} required autoComplete="family-name" />
        </div>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <Field label="Email" name="email" type="email" placeholder="tu@negocio.com" value={form.email} onChange={set("email")} required autoComplete="email" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" name="phone" type="tel" placeholder="+34 600 000 000" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            <Field label="Empresa / Negocio" name="company" placeholder="Opcional" value={form.company} onChange={set("company")} autoComplete="organization" />
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
          Dirección de envío
          <Badge className="ml-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
            <Truck className="h-3 w-3 mr-1" /> Envío gratis
          </Badge>
        </h3>
        <div className="space-y-3">
          <Field label="Dirección" name="address" placeholder="Calle, número, piso..." value={form.address} onChange={set("address")} required autoComplete="street-address" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" name="city" value={form.city} onChange={set("city")} required autoComplete="address-level2" />
            <Field label="Código postal" name="postalCode" value={form.postalCode} onChange={set("postalCode")} required autoComplete="postal-code" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="province" className="text-sm font-medium text-gray-700 dark:text-gray-300">Provincia</label>
            <select
              id="province"
              value={form.province}
              onChange={(e) => set("province")(e.target.value)}
              className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">Selecciona provincia</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5">
            <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Solo enviamos a España Península · Estimado Q1 2026 · 5-7 días laborables</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
          Datos de pago
        </h3>
        <div
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 transition-all"
          onLoad={() => setPayReady(true)}
        >
          <PaymentElement
            onReady={() => setPayReady(true)}
            options={{
              layout: "tabs",
              fields: { billingDetails: "never" },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || saving}
        className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
        ) : (
          <><Lock className="mr-2 h-4 w-4" /> Pagar {total} con seguridad</>
        )}
      </Button>

      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL 256-bit</span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Stripe Secure</span>
          <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Garantía 30 días</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Pago procesado de forma segura por Stripe · No guardamos datos de tarjeta
        </p>
      </div>
    </form>
  );
}

/* ── Main checkout page ───────────────────────────────────────────────────── */
export default function NFCCheckout() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();

  const [config, setConfig] = useState<{ publishableKey: string; priceCents: number } | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Fetch config + create payment intent
  useEffect(() => {
    async function init() {
      setInitializing(true);
      try {
        const cfgRes = await fetch("/api/nfc-shop/config");
        if (!cfgRes.ok) throw new Error("Stripe no disponible");
        const cfg = await cfgRes.json();
        if (!cfg.success) throw new Error("Stripe no configurado");
        setConfig({ publishableKey: cfg.publishableKey, priceCents: cfg.priceCents });

        const piRes = await fetch("/api/nfc-shop/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        if (!piRes.ok) throw new Error("Error al inicializar el pago");
        const pi = await piRes.json();
        if (!pi.success) throw new Error("Error al crear la sesión de pago");

        setOrderInfo({
          paymentIntentId: pi.paymentIntentId,
          clientSecret: pi.clientSecret,
          totalCents: pi.totalCents,
        });
      } catch (err: any) {
        setLoadError(err.message || "Error al cargar el checkout");
      } finally {
        setInitializing(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCents = orderInfo?.totalCents ?? (config?.priceCents ?? 2500) * quantity;
  const total = `${(totalCents / 100).toFixed(2).replace(".", ",")}€`;
  const unitPrice = `${((config?.priceCents ?? 2500) / 100).toFixed(2).replace(".", ",")}€`;

  const FEATURES = [
    "Stand NFC con tu logo y marca",
    "Configuración incluida (5 min)",
    "Compatible iOS + Android",
    "Envío gratis a España Península",
    "Garantía de devolución 30 días",
    "Soporte personalizado incluido",
  ];

  return (
    <div className="page-texture min-h-screen">
      <LandingHeader />

      {/* Top trust bar */}
      <div className="bg-blue-600 text-white text-xs py-2">
        <div className="container mx-auto px-4 flex items-center justify-center gap-6 flex-wrap">
          <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Envío gratuito a España</span>
          <span className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Garantía 30 días</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Pago 100% seguro</span>
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> SSL 256-bit</span>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        {/* Back link */}
        <button
          onClick={() => navigate(`/${language}/nfc`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al producto
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">

          {/* ── LEFT: Form ─────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Finalizar pedido
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Completa tus datos para recibir tu NFC Stand.
              </p>
            </div>

            {initializing ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Preparando el checkout...</p>
              </div>
            ) : loadError ? (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">No se pudo cargar el checkout</p>
                <p className="text-sm text-gray-500 mb-4">{loadError}</p>
                <p className="text-sm text-gray-500">
                  Contacta con nosotros en{" "}
                  <a href="mailto:info@holarevi.com" className="text-blue-600 underline">info@holarevi.com</a>
                </p>
              </div>
            ) : config && orderInfo ? (
              <Elements
                stripe={getStripePromise(config.publishableKey)}
                options={{
                  clientSecret: orderInfo.clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#2563EB",
                      borderRadius: "8px",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    },
                  },
                  locale: "es",
                }}
              >
                <CheckoutForm
                  paymentIntentId={orderInfo.paymentIntentId}
                  totalCents={orderInfo.totalCents}
                />
              </Elements>
            ) : null}
          </div>

          {/* ── RIGHT: Order summary ────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Product card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" />
                    <path d="M14 17h2" /><path d="M20 14h.01" /><path d="M14 14h.01" /><path d="M20 20h.01" /><path d="M17 20h.01" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Stand NFC HolaRevi</span>
                    <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200">
                      Oferta lanzamiento
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Personalizado con tu logo · Preconfigurado</p>
                </div>
              </div>

              {/* Star rating */}
              <div className="flex items-center gap-1 mb-5">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                <span className="text-xs text-gray-500 ml-1">+250 negocios interesados</span>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Precio unitario</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{unitPrice}</span>
                    <span className="text-gray-400 line-through text-xs ml-1.5">99€</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cantidad</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Envío</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Gratis</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{total}</span>
                    <p className="text-xs text-gray-400">IVA incluido</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features included */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Incluido en tu pedido</p>
              <ul className="space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust signals */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Pago seguro</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Garantía 30 días</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Soporte incluido</span>
                </div>
              </div>
            </div>

            {/* Need help */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 px-2">
              ¿Tienes dudas?{" "}
              <a href="mailto:info@holarevi.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                info@holarevi.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
