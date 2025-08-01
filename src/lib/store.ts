/* /src/lib/store.ts */

// --- Type Definitions ---
export type NodeStatus = 'active' | 'inactive' | 'unauthorized' | 'checking';

export interface Node {
  name: string;
  addr: string;
  token: string;
  status: NodeStatus;
}

export interface Nodes {
  [key: string]: Node;
}

// --- Constants ---
const NODES_KEY = '@rfs/nodes';
const CURRENT_NODE_KEY = '@rfs/current'; // Updated key

// --- Utility Functions ---
const safeLocalStorage = (action: 'get' | 'set' | 'remove', key: string, value?: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (action === 'get') {
      return window.localStorage.getItem(key);
    }
    if (action === 'set' && value !== undefined) {
      window.localStorage.setItem(key, value);
    }
    if (action === 'remove') {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.error(`localStorage access failed for key "${key}":`, e);
  }
  return null;
};


export const getNodes = (): Nodes => {
  const nodesJson = safeLocalStorage('get', NODES_KEY);
  return nodesJson ? JSON.parse(nodesJson) : {};
};

export const saveNodes = (nodes: Nodes) => {
  safeLocalStorage('set', NODES_KEY, JSON.stringify(nodes));
};

export const getCurrentNodeId = (): string | null => {
  return safeLocalStorage('get', CURRENT_NODE_KEY);
};

export const setCurrentNodeId = (nodeId: string | null) => {
  if (nodeId) {
    safeLocalStorage('set', CURRENT_NODE_KEY, nodeId);
  } else {
    safeLocalStorage('remove', CURRENT_NODE_KEY);
  }
};
