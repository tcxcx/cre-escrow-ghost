// @bu/agentic-ui — A2UI v0.9 renderer with Bu component catalog

// Types
export type {
  A2UIMessage,
  CreateSurfacePayload,
  UpdateComponentsPayload,
  UpdateDataModelPayload,
  DeleteSurfacePayload,
  ComponentDefinition,
  DynamicValue,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  DynamicStringList,
  ChildList,
  TemplateBinding,
  Action,
  ActionPayload,
  ActionHandler,
  CheckRule,
  Checkable,
  ValidationResult,
  ScopeValue,
  DataModel,
  A2UIComponentProps,
} from './types';

// Renderer
export {
  A2UIProvider,
  A2UIRenderer,
  ComponentRenderer,
  useDispatchAction,
  useDataBinding,
  useFormBinding,
  useStringBinding,
  useDataModel,
  useValidation,
  useComponent,
  useSurfaceContext,
  useScope,
  useScopeBasePath,
  ActionProvider,
  useActionContext,
  useA2UIMessageHandler,
} from './renderer';

export type {
  A2UIProviderProps,
  A2UIRendererProps,
  A2UIMessageHandler,
} from './renderer';

// Catalog
export { buCatalog } from './catalog';
export type { Catalog } from './catalog';
export { buCatalogSchema, buCatalogSchemaJSON } from './catalog';
export type { CatalogSchema, CatalogSchemaEntry } from './catalog';

// Copilot
export { BuCopilotProvider } from './copilot';
export type { BuCopilotProviderProps } from './copilot';
export { useBufiContextReadable } from './copilot';
export type { PageContext } from './copilot';
export { useBufiSuggestions } from './copilot';
export { useNegativeReadable } from './copilot';
export { useBufiHITLActions } from './copilot';
export type { HITLConfig } from './copilot';

