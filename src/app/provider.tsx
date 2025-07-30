/* /src/app/provider.tsx */

'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { getNodes, saveNodes, getCurrentNodeId, setCurrentNodeId as saveCurrentNodeId, type Nodes, type Node, type NodeStatus } from '~/lib/store';
import { request } from '~/api/request';

// --- Type Definitions ---
interface SystemIp {
  ipv4: string[];
  ipv6: string[];
}

interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  ip: SystemIp;
  // uptime can be added here if needed
}

interface AppContextType {
  nodes: Nodes;
  currentNodeId: string | null;
  currentNodeInfo: SystemInfo | null;
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
  const [currentNodeInfo, setCurrentNodeInfo] = useState<SystemInfo | null>(null);
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
      return prevNodes;
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
        setCurrentNodeInfo(null); // Clear previous info
        try {
          const res = await request('/v1/system/information');
          if (res.ok) {
            const json = await res.json();
            setCurrentNodeInfo(json.data);
            updateNodeStatusInternal(initialCurrentNodeId, 'active');
          } else if (res.status === 403) {
            updateNodeStatusInternal(initialCurrentNodeId, 'unauthorized');
            saveCurrentNodeId(null);
            router.push('/setup');
          } else {
            updateNodeStatusInternal(initialCurrentNodeId, 'inactive');
          }
        } catch {
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
    if (nodeId) {
      // Reload the page to re-trigger the health check for the new node
      window.location.assign('/');
    } else {
      router.push('/setup');
    }
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
    currentNodeInfo,
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
