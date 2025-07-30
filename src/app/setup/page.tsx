/* /src/app/setup/page.tsx */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '~/app/provider';
import { generateToken } from '~/api/token';
import { Link as LinkIcon, KeyRound, Server, Loader2, CheckCircle, XCircle } from 'lucide-react';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export default function SetupPage() {
  const { addNode, setCurrentNode } = useApp();
  const router = useRouter();

  const [nodeName, setNodeName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [seed, setSeed] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('verifying');
    setError('');

    // 1. Ping the root to check if the server is online
    try {
      const rootRes = await fetch(apiUrl);
      if (!rootRes.ok) throw new Error('Server is not reachable.');
    } catch (err) {
      setError('API address is not reachable. Check the URL and CORS settings.');
      setStatus('error');
      return;
    }

    // 2. Test the token against a protected endpoint
    try {
      const testToken = await generateToken(seed);
      const testRes = await fetch(new URL('/v1/system/information', apiUrl).toString(), {
        headers: { 'Authorization': testToken },
      });

      if (testRes.status === 403) {
        throw new Error('Authentication failed. The provided token is invalid.');
      }
      if (!testRes.ok) {
        throw new Error(`Server returned an error: ${testRes.status}`);
      }
      
      // 3. If successful, save the node and redirect
      setStatus('success');
      const newNodeId = `node_${Date.now()}`;
      addNode(newNodeId, {
        name: nodeName,
        addr: apiUrl,
        token: seed,
        status: 'active',
      });
      setCurrentNode(newNodeId);
      router.push('/');

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during verification.');
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 rounded-xl" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
          Add a Node
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--subtext-color)' }}>
          Configure a new twig instance to manage.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="node-name" className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
            Node Name
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Server className="w-4 h-4" style={{ color: 'var(--subtext-color)' }} />
            </span>
            <input
              id="node-name"
              name="node-name"
              type="text"
              required
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="e.g., Main Server"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
              style={{
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--tertiary-color)',
                color: 'var(--text-color)',
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor="api-url" className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
            API Address
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <LinkIcon className="w-4 h-4" style={{ color: 'var(--subtext-color)' }} />
            </span>
            <input
              id="api-url"
              name="api-url"
              type="url"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://twig.example.com"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
              style={{
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--tertiary-color)',
                color: 'var(--text-color)',
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor="token" className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
            Node Key
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--subtext-color)' }} />
            </span>
            <input
              id="token"
              name="token"
              type="password"
              required
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Enter your secret node key"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]"
              style={{
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--tertiary-color)',
                color: 'var(--text-color)',
              }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center text-sm text-red-500">
            <XCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'verifying'}
          className="w-full flex justify-center items-center py-2 px-4 text-white font-semibold rounded-lg transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-color)] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--theme-color)',
          }}
        >
          {status === 'verifying' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect and Save'}
        </button>
      </form>
    </div>
  );
}
