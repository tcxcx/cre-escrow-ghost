/**
 * A2UI 0.9 React Renderer - Type Definitions
 *
 * Core type definitions for the A2UI 0.9 React renderer.
 * Based on the A2UI 0.9 protocol specification.
 *
 * Vendored from @a2ui-sdk/types v0.9
 */

// ============ Message Types (Server to Client) ============

/**
 * A2UI message from server to client.
 * Each message contains exactly one of the four message types.
 */
export type A2UIMessage =
  | { createSurface: CreateSurfacePayload }
  | { updateComponents: UpdateComponentsPayload }
  | { updateDataModel: UpdateDataModelPayload }
  | { deleteSurface: DeleteSurfacePayload }

/**
 * CreateSurface message payload - initializes a new Surface.
 */
export interface CreateSurfacePayload {
  surfaceId: string
  catalogId: string
}

/**
 * UpdateComponents message payload - adds/updates components in the surface's component tree.
 */
export interface UpdateComponentsPayload {
  surfaceId: string
  components: ComponentDefinition[]
}

/**
 * UpdateDataModel message payload - updates the data model at a specific path.
 */
export interface UpdateDataModelPayload {
  surfaceId: string
  /** JSON Pointer path (RFC 6901), defaults to "/" (root) */
  path?: string
  /** If omitted, data at path is removed */
  value?: unknown
}

/**
 * DeleteSurface message payload - removes a Surface.
 */
export interface DeleteSurfacePayload {
  surfaceId: string
}

// ============ Dynamic Value Types ============

/**
 * A function call expression.
 */
export interface FunctionCall {
  call: string
  args?: Record<string, DynamicValue>
  returnType?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
}

/**
 * Logic expression for boolean evaluation.
 */
export type LogicExpression =
  | { and: LogicExpression[] }
  | { or: LogicExpression[] }
  | { not: LogicExpression }
  | FunctionCall
  | { true: true }
  | { false: false }

/**
 * Generic dynamic value (any type).
 */
export type DynamicValue =
  | string
  | number
  | boolean
  | { path: string }
  | FunctionCall

/**
 * Dynamic string value.
 */
export type DynamicString = string | { path: string } | FunctionCall

/**
 * Dynamic number value.
 */
export type DynamicNumber = number | { path: string } | FunctionCall

/**
 * Dynamic boolean value.
 */
export type DynamicBoolean = boolean | { path: string } | LogicExpression

/**
 * Dynamic string list value.
 */
export type DynamicStringList = string[] | { path: string } | FunctionCall

/**
 * Union of all bindable value types (for form binding hooks).
 * Used by useFormBinding to accept any dynamic value type.
 */
export type FormBindableValue =
  | DynamicValue
  | DynamicString
  | DynamicNumber
  | DynamicBoolean
  | DynamicStringList

// ============ Children Definition ============

/**
 * Template binding for dynamic child generation.
 */
export interface TemplateBinding {
  componentId: string
  path: string
}

/**
 * Children definition for container components.
 */
export type ChildList =
  | string[] // Static list of component IDs
  | TemplateBinding // Template binding

// ============ Validation ============

/**
 * Check rule for validation.
 */
export interface CheckRule {
  message: string
  call?: string
  args?: Record<string, DynamicValue>
  and?: CheckRule[]
  or?: CheckRule[]
  not?: CheckRule
  true?: true
  false?: false
}

/**
 * Mixin interface for components that support validation checks.
 */
export interface Checkable {
  checks?: CheckRule[]
}

// ============ Component Definitions ============

/**
 * Common properties for all components.
 */
export interface ComponentCommon {
  id: string
  /** flex-grow for Row/Column children */
  weight?: number
}

/**
 * Base component properties that all components share.
 */
export interface BaseComponentDefinition extends ComponentCommon {
  id: string
  /** Discriminator: "Text", "Button", etc. */
  component: string
}

/**
 * Any components.
 */
export interface ComponentDefinition extends BaseComponentDefinition {
  [key: string]: unknown
}

// ============ Internal State Types ============

/**
 * Data model type (hierarchical key-value store).
 */
export type DataModel = Record<string, unknown>

/**
 * Surface state.
 */
export interface SurfaceState {
  surfaceId: string
  catalogId: string
  components: Map<string, ComponentDefinition>
  dataModel: DataModel
  created: boolean
}

/**
 * Scope value for collection scopes.
 */
export interface ScopeValue {
  /** null = root scope, otherwise the base path for relative resolution */
  basePath: string | null
}

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean
  /** List of failed check messages */
  errors: string[]
}

// ============ Action Types (Client to Server) ============

/**
 * Action definition (attached to Button components).
 */
export interface Action {
  name: string
  context?: Record<string, DynamicValue>
}

/**
 * Resolved action payload sent to the action handler.
 */
export interface ActionPayload {
  name: string
  surfaceId: string
  sourceComponentId: string
  timestamp: string // ISO 8601
  context: Record<string, unknown>
}

/**
 * Action handler callback type.
 */
export type ActionHandler = (action: ActionPayload) => void

// ============ Component Props (Standard Catalog) ============

/**
 * Base props shared by all A2UI components when rendered.
 */
export type A2UIComponentProps<T = unknown> = T & {
  surfaceId: string
  componentId: string
  weight?: number
}

// --- Display Component Props ---

/**
 * Text component props.
 */
export interface TextComponentProps {
  text: DynamicString
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body'
}

/**
 * Image component props.
 */
export interface ImageComponentProps {
  url: DynamicString
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  variant?:
    | 'icon'
    | 'avatar'
    | 'smallFeature'
    | 'mediumFeature'
    | 'largeFeature'
    | 'header'
}

/**
 * Icon component props.
 */
export interface IconComponentProps {
  name: DynamicString
}

/**
 * Video component props.
 */
export interface VideoComponentProps {
  url: DynamicString
}

/**
 * AudioPlayer component props.
 */
export interface AudioPlayerComponentProps {
  url: DynamicString
  description?: DynamicString
}

/**
 * Divider component props.
 */
export interface DividerComponentProps {
  axis?: 'horizontal' | 'vertical'
}

// --- Layout Component Props ---

/**
 * Justify values for flex layouts (main axis distribution).
 */
export type Justify =
  | 'start'
  | 'center'
  | 'end'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly'
  | 'stretch'

/**
 * Align values for flex layouts (cross axis alignment).
 */
export type Align = 'start' | 'center' | 'end' | 'stretch'

/**
 * Tab item definition.
 */
export interface TabItem {
  title: DynamicString
  /** Component ID */
  child: string
}

/**
 * Row component props.
 */
export interface RowComponentProps {
  children: ChildList
  justify?: Justify
  align?: Align
}

/**
 * Column component props.
 */
export interface ColumnComponentProps {
  children: ChildList
  justify?: Justify
  align?: Align
}

/**
 * Card component props.
 */
export interface CardComponentProps {
  child: string
}

/**
 * Tabs component props.
 */
export interface TabsComponentProps {
  tabs: TabItem[]
}

/**
 * List component props.
 */
export interface ListComponentProps {
  children: ChildList
  direction?: 'vertical' | 'horizontal'
  align?: Align
}

/**
 * Modal component props.
 */
export interface ModalComponentProps {
  trigger: string
  content: string
}

// --- Interactive Component Props ---

/**
 * Checkable props mixin for validation.
 */
export interface CheckableProps {
  checks?: CheckRule[]
}

/**
 * Button component props.
 */
export interface ButtonComponentProps extends CheckableProps {
  child: string
  primary?: boolean
  action: Action
}

/**
 * TextField component props.
 */
export interface TextFieldComponentProps extends CheckableProps {
  label: DynamicString
  value?: DynamicString
  variant?: 'longText' | 'number' | 'shortText' | 'obscured'
}

/**
 * CheckBox component props.
 */
export interface CheckBoxComponentProps extends CheckableProps {
  label: DynamicString
  value: DynamicBoolean
}

/**
 * Choice option definition.
 */
export interface ChoiceOption {
  label: DynamicString
  value: string
}

/**
 * ChoicePicker component props.
 */
export interface ChoicePickerComponentProps extends CheckableProps {
  label?: DynamicString
  variant?: 'multipleSelection' | 'mutuallyExclusive'
  options: ChoiceOption[]
  value: DynamicStringList
}

/**
 * Slider component props.
 */
export interface SliderComponentProps extends CheckableProps {
  label?: DynamicString
  min: number
  max: number
  value: DynamicNumber
}

/**
 * DateTimeInput component props.
 */
export interface DateTimeInputComponentProps extends CheckableProps {
  value: DynamicString
  enableDate?: boolean
  enableTime?: boolean
  outputFormat?: string
  label?: DynamicString
}
