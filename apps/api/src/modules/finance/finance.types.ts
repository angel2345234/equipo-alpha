export interface QuoteSimulationInput {
  assetId?: string;
  totalPrice: number;
  downPayment: number;       // Cuota inicial
  installments: number;       // Número de cuotas (ej: 12, 24, 36)
  annualInterestRate: number; // TEA en porcentaje (ej: 10 para 10%)
  startDate?: string;         // Fecha inicio primer pago (YYYY-MM-DD)
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  paymentAmount: number;     // Cuota periódica fija (C)
  principalPayment: number;  // Amortización al capital (A)
  interestPayment: number;   // Interés del periodo (I)
  remainingBalance: number;  // Saldo deudor final del periodo
}

export interface QuoteSimulationResult {
  totalPrice: number;
  downPayment: number;
  financedAmount: number;    // Capital financiado (P)
  installments: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  monthlyPayment: number;    // Monto de la cuota fija
  totalInterest: number;     // Suma total de intereses pagados
  totalFinancedPayment: number; // Total pagado (Capital + Intereses)
  schedule: InstallmentScheduleItem[];
}