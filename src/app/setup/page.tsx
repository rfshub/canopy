/* /src/app/setup/page.tsx */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '~/app/provider';
import { generateToken } from '~/api/token';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Link as LinkIcon,
  KeyRound,
  Server,
  Loader2,
  XCircle,
  Plus,
  Trash2,
  SquareMousePointer,
  CheckCircle,
} from 'lucide-react';
import type { NodeStatus } from '~/lib/store';

const StatusBadge = ({ status }: { status: NodeStatus }) => {
  const statusConfig = {
    checking: { text: 'Checking...', color: 'var(--subtext-color)', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    active: { text: 'Online', color: 'var(--text-color)', icon: <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--theme-color)'}} /> },
    unauthorized: { text: 'Unauthorized', color: 'var(--error-color)', icon: <XCircle className="w-3 h-3" /> },
    inactive: { text: 'Config Error', color: 'var(--subtext-color)', icon: <XCircle className="w-3 h-3" /> },
  };
  const config = statusConfig[status];

  return (
    <div className="flex items-center text-xs px-2 py-1" style={{ color: config.color }}>
      <span className="mr-1.5">{config.icon}</span>
      {config.text}
    </div>
  );
};

const AddNodeDialog = () => {
  const { addNode, setCurrentNode } = useApp();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [seed, setSeed] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      await fetch(apiUrl);
    } catch {
      setError('API address is not reachable. Check URL and CORS.');
      setIsVerifying(false);
      return;
    }

    try {
      const testToken = await generateToken(seed);
      const testRes = await fetch(new URL('/v1/system/information', apiUrl).toString(), {
        headers: { Authorization: testToken },
      });

      if (testRes.status === 403) throw new Error('Authentication failed. Invalid Node Key.');
      if (!testRes.ok) throw new Error(`Server error: ${testRes.status}`);
      const newNodeId = `node_${Date.now()}`;
      addNode(newNodeId, { name: nodeName, addr: apiUrl, token: seed, status: 'active' });
      setCurrentNode(newNodeId);
      setIsOpen(false);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      setIsVerifying(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="w-full flex items-center justify-center py-2 px-4 font-semibold rounded-lg transition-colors duration-200 border-2 border-dashed hover:bg-[var(--tertiary-color)]"
          style={{ borderColor: 'var(--tertiary-color)', color: 'var(--subtext-color)' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Node
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-8 space-y-6 rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ backgroundColor: 'var(--secondary-color)' }}>
          <Dialog.Title className="text-2xl font-bold text-center" style={{ color: 'var(--text-color)' }}>
            Add a Node
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-center" style={{ color: 'var(--subtext-color)' }}>
            Configure a new twig instance to manage.
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Server className="w-4 h-4" style={{color: 'var(--subtext-color)'}} /></span>
              <input value={nodeName} onChange={(e) => setNodeName(e.target.value)} placeholder="Node Name" required className="w-full p-2 pl-10 rounded-lg border" style={{backgroundColor: 'var(--primary-color)', borderColor: 'var(--tertiary-color)'}}/>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><LinkIcon className="w-4 h-4" style={{color: 'var(--subtext-color)'}} /></span>
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="API Address" type="url" required className="w-full p-2 pl-10 rounded-lg border" style={{backgroundColor: 'var(--primary-color)', borderColor: 'var(--tertiary-color)'}}/>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><KeyRound className="w-4 h-4" style={{color: 'var(--subtext-color)'}} /></span>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Node Key" type="password" required className="w-full p-2 pl-10 rounded-lg border" style={{backgroundColor: 'var(--primary-color)', borderColor: 'var(--tertiary-color)'}}/>
            </div>
            {error && <div className="flex items-center text-sm" style={{color: 'var(--error-color)'}}><XCircle className="w-4 h-4 mr-2" />{error}</div>}
            <button type="submit" disabled={isVerifying} className="w-full flex justify-center items-center py-2 px-4 text-white font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-color)' }}>
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect and Save'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// --- Main Page Component ---
export default function SetupPage() {
  const { nodes, currentNodeId, setCurrentNode, removeNode, updateNodeStatus } = useApp();
  const [statuses, setStatuses] = useState<Record<string, NodeStatus>>({});
  const nodeIds = JSON.stringify(Object.keys(nodes));

  useEffect(() => {
    const checkAllNodes = async () => {
      const parsedNodeIds = JSON.parse(nodeIds);
      if (parsedNodeIds.length === 0) return;

      const statusPromises = parsedNodeIds.map(async (nodeId: string) => {
        const node = nodes[nodeId];
        if (!node) return [nodeId, 'inactive'];
        setStatuses(s => ({ ...s, [nodeId]: 'checking' }));
        try {
          const token = await generateToken(node.token);
          const res = await fetch(new URL('/v1/system/information', node.addr), {
            headers: { Authorization: token },
          });
          if (res.ok) return [nodeId, 'active'];
          if (res.status === 403) return [nodeId, 'unauthorized'];
          return [nodeId, 'inactive'];
        } catch {
          return [nodeId, 'inactive'];
        }
      });
      const results = await Promise.all(statusPromises);
      const newStatuses = Object.fromEntries(results);
      setStatuses(newStatuses);
      Object.entries(newStatuses).forEach(([nodeId, status]) => {
        updateNodeStatus(nodeId, status as NodeStatus);
      });
    };
    checkAllNodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds, updateNodeStatus]);

  const handleSelect = (nodeId: string) => {
    setCurrentNode(nodeId);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 rounded-xl" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
          Node Selection
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--subtext-color)' }}>
          Select a configured node or add a new one.
        </p>
      </div>
      <div className="space-y-3">
        {Object.keys(nodes).length > 0 ? (
          Object.entries(nodes).map(([nodeId, node]) => {
            const isCurrent = nodeId === currentNodeId;
            return (
              <div key={nodeId} className={`flex items-center p-3 rounded-lg border-2 transition-colors duration-200`} 
                style={{
                  backgroundColor: 'var(--primary-color)',
                  borderColor: isCurrent ? 'var(--theme-color)' : 'transparent'
                }}>
                <Server className="w-8 h-8 mr-4" style={{ color: 'var(--subtext-color)' }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text-color)' }}>{node.name}</p>
                  <p className="text-xs" style={{ color: 'var(--subtext-color)' }}>{node.addr}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={statuses[nodeId] || node.status} />
                  <button onClick={() => handleSelect(nodeId)} disabled={(statuses[nodeId] || node.status) !== 'active' || isCurrent}
                    className="p-1.5 rounded-md hover:bg-[var(--tertiary-color)] disabled:opacity-30 disabled:cursor-not-allowed">
                    {isCurrent ? (
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--theme-color)' }} />
                    ) : (
                      <SquareMousePointer className="w-4 h-4" style={{ color: 'var(--theme-color)' }} />
                    )}
                  </button>
                  <button onClick={() => removeNode(nodeId)} className="p-1.5 rounded-md hover:bg-[var(--tertiary-color)]">
                    <Trash2 className="w-4 h-4" style={{color: 'var(--error-color)'}} />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-center text-sm py-4" style={{ color: 'var(--subtext-color)' }}>No nodes configured yet.</p>
        )}
      </div>
      <AddNodeDialog />
    </div>
  );
}
