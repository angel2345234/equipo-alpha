import { QuoteSimulationInput, QuoteSimulationResult, InstallmentScheduleItem } from "./finance.types";

export class FinanceService {
  static calculateFrenchSchedule(input: QuoteSimulationInput): QuoteSimulationResult {
    const { totalPrice, downPayment, installments, annualInterestRate } = input;

    if (totalPrice <= 0) {
      throw new Error("El precio total debe ser mayor a 0.");
    }
    if (downPayment < 0 || downPayment >= totalPrice) {
      throw new Error("La cuota inicial debe ser mayor o igual a 0 y menor al precio total.");
    }
    if (!Number.isInteger(installments) || installments <= 0) {
      throw new Error("El número de cuotas debe ser un número entero mayor a 0.");
    }

    const financedAmount = Number((totalPrice - downPayment).toFixed(2));
    
    // Conversión de Tasa Efectiva Anual (TEA) a Tasa Efectiva Mensual (TEM)
    // TEM = (1 + TEA)^(1/12) - 1
    const teaDecimal = annualInterestRate / 100;
    const monthlyRate = teaDecimal > 0 
      ? Math.pow(1 + teaDecimal, 1 / 12) - 1 
      : 0;

    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      const factor = Math.pow(1 + monthlyRate, installments);
      monthlyPayment = Number((financedAmount * ((monthlyRate * factor) / (factor - 1))).toFixed(2));
    } else {
      monthlyPayment = Number((financedAmount / installments).toFixed(2));
    }

    const schedule: InstallmentScheduleItem[] = [];
    let currentBalance = financedAmount;
    let accumulatedInterest = 0;

    const baseDate = input.startDate ? new Date(input.startDate) : new Date();

    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + i);

      const interestPayment = Number((currentBalance * monthlyRate).toFixed(2));
      let principalPayment = Number((monthlyPayment - interestPayment).toFixed(2));

      // Ajuste de redondeo en la última cuota para liquidar el saldo exacto
      if (i === installments || principalPayment > currentBalance) {
        principalPayment = currentBalance;
        monthlyPayment = Number((principalPayment + interestPayment).toFixed(2));
      }

      currentBalance = Number((currentBalance - principalPayment).toFixed(2));
      accumulatedInterest = Number((accumulatedInterest + interestPayment).toFixed(2));

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split("T")[0],
        paymentAmount: monthlyPayment,
        principalPayment,
        interestPayment,
        remainingBalance: Math.max(0, currentBalance),
      });
    }

    return {
      totalPrice,
      downPayment,
      financedAmount,
      installments,
      annualInterestRate,
      monthlyInterestRate: Number((monthlyRate * 100).toFixed(4)),
      monthlyPayment,
      totalInterest: accumulatedInterest,
      totalFinancedPayment: Number((financedAmount + accumulatedInterest).toFixed(2)),
      schedule,
    };
  }
}