const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8082/api`
    : "http://localhost:8082/api");

export interface Asset {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  price: string;
  currency: string;
  area: string;
  details?: { description?: string; block?: string; stage?: string };
  project_name?: string | null;
}

export interface AssetFilters {
  type?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface CreateLeadPayload {
  fullName: string;
  email: string;
  phone: string;
  assetId: string;
  message?: string;
  source?: string;
}

export interface QuoteSimulationPayload {
  assetId?: string;
  totalPrice: number;
  downPayment: number;
  installments: number;
  annualInterestRate: number;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  paymentAmount: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

export interface QuoteSimulationResponse {
  totalPrice: number;
  downPayment: number;
  financedAmount: number;
  installments: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalFinancedPayment: number;
  schedule: InstallmentScheduleItem[];
}

export async function getAssets(filters?: AssetFilters): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append("type", filters.type);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.minPrice) params.append("minPrice", filters.minPrice);
  if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_URL}/assets${query}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Error al obtener los activos");
  }
  return res.json();
}

export async function createLead(payload: CreateLeadPayload) {
  const res = await fetch(`${API_URL}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("No se pudo registrar la solicitud");
  }

  return res.json();
}

export async function simulateQuote(payload: QuoteSimulationPayload): Promise<QuoteSimulationResponse> {
  const res = await fetch(`${API_URL}/quotes/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al calcular el financiamiento");
  }

  return res.json();
}