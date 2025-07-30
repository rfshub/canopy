/* /src/app/provider.tsx */

'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { getNodes, saveNodes, getCurrentNodeId, setCurrentNodeId as saveCurrentNodeId, type Nodes, type Node, type NodeStatus } from '~/lib/store';
import { request } from '~/api/request';

// --- Context Definition ---
interface AppContextType {
  nodes: Nodes;
  currentNodeId: string | null;
  setCurrentNode: (nodeId: string | null) => void;
  addNode: (nodeId: string, node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Main Provider Component ---
export function AppProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Nodes>({});
  const [currentNodeId, setInternalCurrentNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const updateNodeStatusInternal = useCallback((nodeId: string, status: NodeStatus) => {
    setNodes(prevNodes => {
      const newNodes = { ...prevNodes };
      if (newNodes[nodeId] && newNodes[nodeId].status !== status) {
        newNodes[nodeId].status = status;
        saveNodes(newNodes);
        return newNodes;
      }
      return prevNodes; // Return previous state if no change
    });
  }, []);

  useEffect(() => {
    const initialNodes = getNodes();
    const initialCurrentNodeId = getCurrentNodeId();
    setNodes(initialNodes);
    setInternalCurrentNodeId(initialCurrentNodeId);

    if (!initialCurrentNodeId || !initialNodes[initialCurrentNodeId]) {
      router.push('/setup');
      setIsLoading(false);
    } else {
      const healthCheck = async () => {
        try {
          const res = await request('/v1/system/information');
          if (res.ok) {
            updateNodeStatusInternal(initialCurrentNodeId, 'active');
          } else if (res.status === 403) {
            updateNodeStatusInternal(initialCurrentNodeId, 'unauthorized');
            saveCurrentNodeId(null);
            router.push('/setup');
          } else {
            updateNodeStatusInternal(initialCurrentNodeId, 'inactive');
          }
        } catch {
          // This catch is intentional. If the request fails (e.g., network error),
          // it means the node is offline. We mark it as inactive without logging an error.
          updateNodeStatusInternal(initialCurrentNodeId, 'inactive');
        } finally {
          setIsLoading(false);
        }
      };
      healthCheck();
    }
  }, [router, updateNodeStatusInternal]);

  const setCurrentNode = useCallback((nodeId: string | null) => {
    saveCurrentNodeId(nodeId);
    setInternalCurrentNodeId(nodeId);
    if (nodeId) router.push('/');
    else router.push('/setup');
  }, [router]);

  const addNode = useCallback((nodeId: string, node: Node) => {
    setNodes(prev => {
      const newNodes = { ...prev, [nodeId]: node };
      saveNodes(newNodes);
      return newNodes;
    });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[nodeId];
      saveNodes(newNodes);
      if (getCurrentNodeId() === nodeId) {
        setCurrentNode(null);
      }
      return newNodes;
    });
  }, [setCurrentNode]);

  const contextValue: AppContextType = {
    nodes,
    currentNodeId,
    isLoading,
    setCurrentNode,
    addNode,
    removeNode,
    updateNodeStatus: updateNodeStatusInternal,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        storageKey="@rfs/theme"
        enableSystem
      >
        {isLoading ? <div className="flex h-screen w-screen items-center justify-center bg-[var(--primary-color)]"></div> : children}
      </NextThemesProvider>
    </AppContext.Provider>
  );
}

// --- Custom Hook for easy context access ---
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
