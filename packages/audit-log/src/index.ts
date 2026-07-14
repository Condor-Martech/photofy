export { AuditAction } from './events.js';
export type {
  ActorType,
  Severity,
  AuditActionValue,
  AuditEvent,
  AuditEntry,
} from './events.js';

export { hashIp } from './hash-ip.js';

export { AuditLogger } from './logger.js';
export type { AuditLoggerOptions } from './logger.js';

export {
  MemoryAuditSink,
  StdoutAuditSink,
  createSupabaseSink,
} from './sinks.js';
export type { AuditSink, SupabaseInsertClient } from './sinks.js';

export {
  DEFAULT_ANOMALY_CONFIG,
  evaluateAnomalies,
  detectProcessingFailureSpike,
  detectAuthFailureSpike,
  detectMassRejection,
} from './anomaly.js';
export type { AnomalyAlert, AnomalyConfig } from './anomaly.js';
