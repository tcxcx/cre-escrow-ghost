import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Connection, NodeChange, EdgeChange, Edge } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'
import type {
  NodeType,
  ContractNode,
  ContractNodeData,
  ContractTemplate,
  ContractSettings,
  SavedContract,
  ValidationResult,
  ValidationError,
} from '@repo/contract-flow'
import { validateContract } from '@repo/contract-flow'



// Debounce timer for history snapshots on form field changes
let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null
const HISTORY_DEBOUNCE_MS = 500

interface ContractState {
  // Contract metadata
  contractId: string | null
  contractName: string
  templateId: string | null
  
  // Flow state
  nodes: ContractNode[]
  edges: Edge[]
  selectedNodeId: string | null
  
  // Validation state
  validationErrors: Record<string, ValidationResult>
  invalidNodeIds: string[]
  structuralErrors: ValidationError[]
  validationWarnings: ValidationError[]
  missingNodeTypes: NodeType[]
  isContractValid: boolean
  
  // History for undo/redo
  history: { nodes: ContractNode[]; edges: Edge[] }[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  lastHistorySnapshot: string // JSON string of last snapshot to detect changes
  
  // Settings
  settings: ContractSettings
  
  // Saved contracts
  savedContracts: SavedContract[]
  currentSavedContract: SavedContract | null
  
  // UI state
  isTemplateModalOpen: boolean
  isPropertiesPanelOpen: boolean
  isDraggingNode: boolean
  isPreviewOpen: boolean
  isSettingsOpen: boolean
  isAiAssistOpen: boolean
  isSaving: boolean
  
  // Actions
  setContractName: (name: string) => void
  setTemplateId: (id: string | null) => void
  
  // Node actions
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: ContractNode) => void
  updateNodeData: (nodeId: string, data: Partial<ContractNodeData>) => void
  deleteNode: (nodeId: string) => void
  setSelectedNodeId: (id: string | null) => void
  
  // Template actions
  loadTemplate: (template: ContractTemplate) => void
  clearCanvas: () => void
  
  // Settings actions
  updateSettings: (settings: Partial<ContractSettings>) => void
  
  // Validation actions
  validateAllNodes: () => void
  
  // Save/Load actions
  saveContract: () => SavedContract | null
  loadSavedContract: (id: string) => void
  deleteSavedContract: (id: string) => void
  generateShareLink: () => string | null
  
  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  pushToHistoryDebounced: () => void
  
  // UI actions
  setTemplateModalOpen: (open: boolean) => void
  setPropertiesPanelOpen: (open: boolean) => void
  setDraggingNode: (dragging: boolean) => void
  setPreviewOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setAiAssistOpen: (open: boolean) => void
}

export const useContractStore = create<ContractState>()(
  persist(
    (set, get) => ({
      // Initial state
      contractId: null,
      contractName: 'Untitled Contract',
      templateId: null,
      
      nodes: [],
      edges: [],
      selectedNodeId: null,
      
      validationErrors: {},
      invalidNodeIds: [],
      structuralErrors: [],
      validationWarnings: [],
      missingNodeTypes: [],
      isContractValid: false,
      
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
      lastHistorySnapshot: '',
      
      settings: {
        yieldStrategy: 'none',
        chain: 'ethereum',
        totalAmount: 0,
        currency: 'USDC',
        commissions: [],
      },
      
      savedContracts: [],
      currentSavedContract: null,
      
      isTemplateModalOpen: false,
      isPropertiesPanelOpen: false,
      isDraggingNode: false,
      isPreviewOpen: false,
      isSettingsOpen: false,
      isAiAssistOpen: false,
      isSaving: false,
      
      // Actions
      setContractName: (name) => set({ contractName: name }),
      setTemplateId: (id) => set({ templateId: id }),
      
      onNodesChange: (changes) => {
        const newNodes = applyNodeChanges(changes, get().nodes) as ContractNode[]
        const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add')
        set({ nodes: newNodes })
        if (hasSignificantChange) {
          get().pushToHistory()
        }
        // Re-validate after changes
        get().validateAllNodes()
      },
      
      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        })
      },
      
      onConnect: (connection) => {
        set({
          edges: addEdge(
            { 
              ...connection, 
              animated: true,
              style: { strokeWidth: 2, stroke: 'hsl(var(--border))' },
              type: 'smoothstep',
            }, 
            get().edges
          ),
        })
      },
      
      addNode: (node) => {
        set({ nodes: [...get().nodes, node] })
        get().pushToHistory()
        get().validateAllNodes()
      },
      
      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        })
        // Track form field changes in history (debounced)
        get().pushToHistoryDebounced()
        // Re-validate after update
        get().validateAllNodes()
      },
      
      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        })
        get().pushToHistory()
        get().validateAllNodes()
      },
      
      setSelectedNodeId: (id) => {
        set({ 
          selectedNodeId: id,
          isPropertiesPanelOpen: id !== null,
        })
      },
      
      loadTemplate: (template) => {
        const timestamp = Date.now()
        // Create a mapping of old IDs to new IDs
        const idMap: Record<string, string> = {}
        const newNodes = template.nodes.map(node => {
          const newId = `${node.id}-${timestamp}`
          idMap[node.id] = newId
          return { ...node, id: newId }
        })
        const newEdges = template.edges.map(edge => ({
          ...edge,
          id: `${edge.id}-${timestamp}`,
          source: idMap[edge.source] || edge.source,
          target: idMap[edge.target] || edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        }))
        
        const initialSnapshot = JSON.stringify({ nodes: newNodes, edges: newEdges })
        set({
          contractId: `contract-${timestamp}`,
          templateId: template.id,
          contractName: template.name,
          nodes: newNodes,
          edges: newEdges,
          isTemplateModalOpen: false,
          selectedNodeId: null,
          currentSavedContract: null,
          // Initialize history with the loaded template
          history: [{ nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) }],
          historyIndex: 0,
          canUndo: false,
          canRedo: false,
          lastHistorySnapshot: initialSnapshot,
        })
        // Validate after loading
        setTimeout(() => get().validateAllNodes(), 100)
      },
      
      clearCanvas: () => {
        set({
          contractId: `contract-${Date.now()}`,
          nodes: [],
          edges: [],
          selectedNodeId: null,
          templateId: null,
          contractName: 'Untitled Contract',
          isTemplateModalOpen: false,
          validationErrors: {},
          invalidNodeIds: [],
          isContractValid: true,
          currentSavedContract: null,
        })
      },
      
      updateSettings: (settings) => {
        set({
          settings: { ...get().settings, ...settings },
        })
      },
      
      validateAllNodes: () => {
        const { nodes } = get()
        const { isValid, nodeErrors, invalidNodeIds, structuralErrors, warnings, missingNodeTypes } = validateContract(nodes)
        set({
          validationErrors: nodeErrors,
          invalidNodeIds,
          structuralErrors,
          validationWarnings: warnings,
          missingNodeTypes,
          isContractValid: isValid && nodes.length > 0,
        })
      },
      
      saveContract: () => {
        const state = get()
        if (!state.isContractValid) {
          return null
        }
        
        set({ isSaving: true })
        
        const now = new Date().toISOString()
        const existingContract = state.savedContracts.find(c => c.id === state.contractId)
        
        const savedContract: SavedContract = {
          id: state.contractId || `contract-${Date.now()}`,
          name: state.contractName,
          templateId: state.templateId,
          nodes: state.nodes,
          edges: state.edges,
          settings: state.settings,
          createdAt: existingContract?.createdAt || now,
          updatedAt: now,
          shareId: existingContract?.shareId || `share-${Math.random().toString(36).substring(2, 10)}`,
        }
        
        set({
          contractId: savedContract.id,
          currentSavedContract: savedContract,
          savedContracts: [
            savedContract,
            ...state.savedContracts.filter(c => c.id !== savedContract.id),
          ],
          isSaving: false,
        })
        
        return savedContract
      },
      
      loadSavedContract: (id) => {
        const contract = get().savedContracts.find(c => c.id === id)
        if (contract) {
          set({
            contractId: contract.id,
            contractName: contract.name,
            templateId: contract.templateId,
            nodes: contract.nodes,
            edges: contract.edges,
            settings: contract.settings,
            currentSavedContract: contract,
            isTemplateModalOpen: false,
          })
          get().validateAllNodes()
        }
      },
      
      deleteSavedContract: (id) => {
        set({
          savedContracts: get().savedContracts.filter(c => c.id !== id),
        })
      },
      
      generateShareLink: () => {
        const contract = get().currentSavedContract
        if (contract?.shareId) {
          return `https://dub.sh/bufi-${contract.shareId}`
        }
        return null
      },
      
      pushToHistory: () => {
        const { nodes, edges, history, historyIndex, lastHistorySnapshot } = get()
        const currentSnapshot = JSON.stringify({ nodes, edges })
        
        // Skip if nothing changed
        if (currentSnapshot === lastHistorySnapshot) {
          return
        }
        
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
        // Limit history to 50 entries
        if (newHistory.length > 50) {
          newHistory.shift()
        }
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: newHistory.length > 1,
          canRedo: false,
          lastHistorySnapshot: currentSnapshot,
        })
      },
      
      pushToHistoryDebounced: () => {
        // Clear existing timer
        if (historyDebounceTimer) {
          clearTimeout(historyDebounceTimer)
        }
        // Set new timer to push to history after debounce period
        historyDebounceTimer = setTimeout(() => {
          get().pushToHistory()
          historyDebounceTimer = null
        }, HISTORY_DEBOUNCE_MS)
      },
      
      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          const { nodes, edges } = history[newIndex]
          const restoredNodes = JSON.parse(JSON.stringify(nodes))
          const restoredEdges = JSON.parse(JSON.stringify(edges))
          set({
            nodes: restoredNodes,
            edges: restoredEdges,
            historyIndex: newIndex,
            canUndo: newIndex > 0,
            canRedo: true,
            lastHistorySnapshot: JSON.stringify({ nodes: restoredNodes, edges: restoredEdges }),
          })
          get().validateAllNodes()
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1
          const { nodes, edges } = history[newIndex]
          const restoredNodes = JSON.parse(JSON.stringify(nodes))
          const restoredEdges = JSON.parse(JSON.stringify(edges))
          set({
            nodes: restoredNodes,
            edges: restoredEdges,
            historyIndex: newIndex,
            canUndo: true,
            canRedo: newIndex < history.length - 1,
            lastHistorySnapshot: JSON.stringify({ nodes: restoredNodes, edges: restoredEdges }),
          })
          get().validateAllNodes()
        }
      },
      
      setTemplateModalOpen: (open) => set({ isTemplateModalOpen: open }),
      setPropertiesPanelOpen: (open) => set({ isPropertiesPanelOpen: open }),
      setDraggingNode: (dragging) => set({ isDraggingNode: dragging }),
      setPreviewOpen: (open) => set({ isPreviewOpen: open }),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setAiAssistOpen: (open) => set({ isAiAssistOpen: open }),
    }),
    {
      name: 'bufi-contract-storage',
      partialize: (state) => ({
        savedContracts: state.savedContracts,
      }),
    }
  )
)
