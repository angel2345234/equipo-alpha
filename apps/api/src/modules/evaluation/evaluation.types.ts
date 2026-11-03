/**
 * ALP5-008 — Evaluation Dataset Types & Criteria
 * Célula Alpha — Zenplus OS — Fase 5: XENIA Intelligence & AI
 */

export type EvaluationCategory =
  | "RETRIEVAL"
  | "GROUNDEDNESS"
  | "ABSTENTION"
  | "PERMISSION"
  | "HUMAN_IN_THE_LOOP"
  | "ADVERSARIAL";

export type ExpectedOutcome =
  | "ANSWER"
  | "ABSTAIN"
  | "DENY"
  | "FLAG_FOR_HUMAN_REVIEW";

export type AbstentionReasonCode =
  | "SOURCE_NOT_FOUND"
  | "EXPIRED_SOURCE"
  | "UNAUTHORIZED_DATA_SCOPE"
  | "UNAUTHORIZED_ROLE"
  | "REQUIRES_HUMAN_CONFIRMATION"
  | "PROMPT_INJECTION_DETECTED";

export type EvaluationSensitivity =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "RESTRICTED";

export interface EvaluationUserContext {
  subject: string;
  role: string;
  dataScopes: string[];
}

export interface EvaluationCaseP0 {
  id: string; // ej: EVAL-P0-001
  name: string;
  category: EvaluationCategory;
  userContext: EvaluationUserContext;
  query: string;
  expectedSources: string[];
  expectedOutcome: ExpectedOutcome;
  groundedFacts: string[];
  forbiddenHallucinations: string[];
  abstentionReason?: AbstentionReasonCode;
  humanReviewRequired: boolean;
  sensitivity: EvaluationSensitivity;
}

export interface ActualAIResponse {
  answer: string;
  citations: string[];
  outcome: ExpectedOutcome;
  abstained: boolean;
  abstentionReason?: string;
  humanReviewFlagged?: boolean;
}

export interface CaseEvaluationResult {
  caseId: string;
  caseName: string;
  category: EvaluationCategory;
  passed: boolean;
  retrievalSuccess: boolean;
  groundednessSuccess: boolean;
  abstentionSuccess: boolean;
  permissionSuccess: boolean;
  humanReviewSuccess: boolean;
  missingCitations: string[];
  hallucinationsDetected: string[];
  unsupportedFacts: string[];
  notes: string[];
}

export interface EvaluationScorecard {
  datasetVersion: string;
  evaluatedAt: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  sourceTraceabilityRate: number; // Objetivo P0: 100%
  criticalLeakageCount: number; // Objetivo P0: 0
  permissionPassRate: number; // Objetivo P0: 100%
  retrievalSuccessRate: number; // Objetivo P0: >= 90%
  abstentionComplianceRate: number; // Objetivo P0: 100%
  exitGatePass: boolean;
  results: CaseEvaluationResult[];
}
