/**
 * @package flow
 *
 * Centralized React Flow utilities for the BUFI contract builder.
 * All node types, interfaces, validation schemas, and factory functions.
 */

// Type definitions
export type {
  NodeType,
  PartyData,
  MilestoneData,
  ConditionData,
  PaymentData,
  SignatureData,
  ClauseData,
  CommissionData,
  IdentityVerificationData,
  ContractNodeData,
  ContractNode,
  ContractTemplate,
  ContractSettings,
  SavedContract,
} from './types'

// Validation
export {
  partySchema,
  milestoneSchema,
  conditionSchema,
  paymentSchema,
  signatureSchema,
  clauseSchema,
  commissionSchema,
  identityVerificationSchema,
  schemaMap,
  validateNode,
  validateContract,
} from './validation'
export type { ValidationError, ValidationResult, ContractValidationResult } from './validation'
export { requiredFieldsByType } from './validation'

// Utilities & factories
export {
  createNode,
  createEdge,
  generateNodeId,
  defaultEdgeOptions,
  proOptions,
  nodePalette,
  getPaletteItem,
} from './utils'
export type { NodePaletteItem } from './utils'
