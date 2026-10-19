import { ReservationService } from "./reservation.service";

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

export function startReservationExpirationScheduler(): void {
  if (process.env.RESERVATION_EXPIRATION_ENABLED !== "true") {
    console.log(
      "[reservations] Vencimiento automático desactivado.",
    );
    return;
  }

  if (timer) {
    return;
  }

  const intervalMs = 60_000;

  timer = setInterval(async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const result =
        await ReservationService.expireDueReservations();

      if (
        result.expiredReservations > 0 ||
        result.releasedAssets > 0
      ) {
        console.log(
          "[reservations] Vencimiento procesado:",
          result,
        );
      }
    } catch (error) {
      console.error(
        "[reservations] Error en el vencimiento automático:",
        error,
      );
    } finally {
      running = false;
    }
  }, intervalMs);

  console.log(
    "[reservations] Programador configurado: intervalo de 60 segundos.",
  );
}
