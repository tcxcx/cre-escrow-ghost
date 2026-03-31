/**
 * Compact catalog schema for LLM system prompt injection.
 * Describes all A2UI v0.9 components the LLM can emit.
 */

export interface CatalogSchemaEntry {
  props: Record<string, string>;
  description?: string;
}

export interface CatalogSchema {
  version: string;
  components: Record<string, CatalogSchemaEntry>;
  messageTypes: Record<string, Record<string, string>>;
}

export const buCatalogSchema: CatalogSchema = {
  version: '0.9',
  components: {
    // Display
    Text: { props: { text: 'string (required)', variant: 'h1|h2|h3|h4|h5|caption|body' } },
    Image: { props: { url: 'string (required)', fit: 'contain|cover|fill|none|scale-down', variant: 'icon|avatar|smallFeature|mediumFeature|largeFeature|header' } },
    Icon: { props: { name: 'lucide icon name (required)' } },
    Divider: { props: { axis: 'horizontal|vertical' } },
    // Layout
    Row: { props: { children: 'componentId[] (required)', justify: 'start|center|end|spaceBetween|spaceAround|spaceEvenly', align: 'start|center|end|stretch' } },
    Column: { props: { children: 'componentId[] (required)', justify: 'same as Row', align: 'same as Row' } },
    List: { props: { children: 'componentId[] (required)', direction: 'vertical|horizontal', align: 'start|center|end|stretch' } },
    Card: { props: { child: 'componentId (required)' } },
    Tabs: { props: { tabs: '{ title: string, child: componentId }[] (required)' } },
    // Interactive
    Button: { props: { child: 'componentId (required)', primary: 'boolean', action: '{ name: string, context?: Record<string,any> } (required)' } },
    TextField: { props: { label: 'string (required)', value: 'string', variant: 'longText|number|shortText|obscured' } },
    CheckBox: { props: { label: 'string (required)', value: 'boolean' } },
    ChoicePicker: { props: { label: 'string', variant: 'multipleSelection|mutuallyExclusive', options: '{ label, value }[] (required)', value: 'string[]' } },
    Slider: { props: { label: 'string', min: 'number (required)', max: 'number (required)', value: 'number' } },
    DateTimeInput: { props: { value: 'string', enableDate: 'boolean', enableTime: 'boolean', label: 'string' } },
    // Financial Extensions
    MetricCard: { props: { label: 'string (required)', value: 'string (required)', trend: 'string', confidence: 'high|medium|low' } },
    ApprovalCard: { props: { title: 'string (required)', description: 'string (required)', approveLabel: 'string', rejectLabel: 'string', approveAction: '{ name, context? } (required)', rejectAction: '{ name, context? } (required)' } },
    StepProgress: { props: { title: 'string', steps: 'string[] (via dataModel path) (required)', currentStep: 'number' } },
    DataResult: { props: { title: 'string (required)', summary: 'string', items: 'string[] (via dataModel path)' } },
    InsightList: { props: { title: 'string', insights: 'string[] (via dataModel path) (required)' } },
    // Analytics Chart Extensions
    BurnRateChart: { props: { title: 'string — chart title (default: "Burn Rate")', data: 'dataModel path (required) — bind to result object' } },
    ForecastChart: { props: { title: 'string — chart title (default: "Forecast")', data: 'dataModel path (required) — bind to result object' } },
    ProfitChart: { props: { title: 'string — chart title (default: "Profit Analysis")', data: 'dataModel path (required) — bind to result object' } },
    RevenueChart: { props: { title: 'string — chart title (default: "Revenue")', data: 'dataModel path (required) — bind to result object' } },
    RunwayChart: { props: { title: 'string — chart title (default: "Runway")', data: 'dataModel path (required) — bind to result object' } },
    SpendingChart: { props: { title: 'string — chart title (default: "Spending")', data: 'dataModel path (required) — bind to result object' } },
    TransactionsTable: { props: { title: 'string — chart title (default: "Transactions")', data: 'dataModel path (required) — bind to result object' } },
    ContactsList: { props: { title: 'string — chart title (default: "Contacts")', data: 'dataModel path (required) — bind to result object' } },
    InvoicesList: { props: { title: 'string — chart title (default: "Invoices")', data: 'dataModel path (required) — bind to result object' } },
    PayrollView: { props: { title: 'string — chart title (default: "Payroll")', data: 'dataModel path (required) — bind to result object' } },
  },
  messageTypes: {
    createSurface: { surfaceId: 'unique string', catalogId: 'bu-catalog' },
    updateComponents: { surfaceId: 'string', components: 'ComponentDefinition[] (id + component + props)' },
    updateDataModel: { surfaceId: 'string', 'path?': 'JSON Pointer', 'value?': 'any (omit to remove)' },
    deleteSurface: { surfaceId: 'string' },
  },
};

/** Compact JSON string for system prompt injection. */
export const buCatalogSchemaJSON = JSON.stringify(buCatalogSchema);
