/* /src/app/provider.tsx */

'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { getNodes, saveNodes, getCurrentNodeId, setCurrentNodeId as saveCurrentNodeId, type Nodes, type Node } from '~/lib/store';
import { request } from '~/api/request';

// --- Context Definition ---
interface AppContextType {
  nodes: Nodes;
  currentNodeId: string | null;
  setCurrentNode: (nodeId: string | null) => void;
  addNode: (nodeId: string, node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNodeStatus: (nodeId: string, status: Node['status']) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Main Provider Component ---
export function AppProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Nodes>({});
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initialNodes = getNodes();
    const initialCurrentNodeId = getCurrentNodeId();
    setNodes(initialNodes);
    setCurrentNodeId(initialCurrentNodeId);

    if (!initialCurrentNodeId || !initialNodes[initialCurrentNodeId]) {
      // No node is configured, go to setup
      router.push('/setup');
      setIsLoading(false);
    } else {
      // Health check the current node
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
        } catch (error) {
          console.error("Health check failed:", error);
          updateNodeStatusInternal(initialCurrentNodeId, 'inactive');
        } finally {
          setIsLoading(false);
        }
      };
      healthCheck();
    }
  }, [router]);

  const updateNodeStatusInternal = (nodeId: string, status: Node['status']) => {
    setNodes(prevNodes => {
      const newNodes = { ...prevNodes };
      if (newNodes[nodeId]) {
        newNodes[nodeId].status = status;
        saveNodes(newNodes);
        return newNodes;
      }
      return prevNodes;
    });
  };

  const contextValue: AppContextType = {
    nodes,
    currentNodeId,
    isLoading,
    setCurrentNode: (nodeId) => {
      saveCurrentNodeId(nodeId);
      setCurrentNodeId(nodeId);
      // When switching, redirect to dashboard to re-trigger data fetching
      if(nodeId) router.push('/');
      else router.push('/setup');
    },
    addNode: (nodeId, node) => {
      setNodes(prev => {
        const newNodes = { ...prev, [nodeId]: node };
        saveNodes(newNodes);
        return newNodes;
      });
    },
    removeNode: (nodeId) => {
      setNodes(prev => {
        const newNodes = { ...prev };
        delete newNodes[nodeId];
        saveNodes(newNodes);
        return newNodes;
      });
    },
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
