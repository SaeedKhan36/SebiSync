// Minimal structured logger for use outside a Trigger.dev task context (i.e.
// in tRPC routers, where Trigger.dev's own `logger` from "@trigger.dev/sdk"
// isn't meaningful — that one attaches to the current run/span). Tasks
// themselves use the SDK's logger directly for dashboard-integrated logs;
// this is only for the "did the .trigger() enqueue call itself succeed"
// logging at the call site.
type LogFields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  console[level](
    JSON.stringify({ level, event, time: new Date().toISOString(), ...fields }),
  );
}

export const log = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
}
