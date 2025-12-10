import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useSession } from '../hooks';
import { CodeEditor, SessionControls, OutputPanel, Header, Button, useToast } from '../components';
import type { ConnectionState } from '../components/ui';

export function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSyncError = useCallback(
    (error: Error) => {
      showToast('error', `Sync failed: ${error.message}`);
    },
    [showToast]
  );

  const {
    session,
    isLoading,
    error,
    executionResult,
    isExecuting,
    isSyncing,
    connectionState,
    updateCode,
    changeLanguage,
    executeCode,
  } = useSession({
    sessionId,
    onSyncError: handleSyncError,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-slate-400">Loading session...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-2xl border border-slate-800 p-8 max-w-md text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-500/20 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100 mb-2">
              Failed to load session
            </h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              icon={<ArrowLeftIcon className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Session not found
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-400 text-xl"
          >
            Session not found
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header with connection status */}
      <Header
        sessionId={session.id}
        connectionState={connectionState as ConnectionState}
        showNewSession
      />

      {/* Session controls */}
      <SessionControls
        sessionId={session.id}
        language={session.language}
        onLanguageChange={changeLanguage}
        onExecute={executeCode}
        isExecuting={isExecuting}
        isSyncing={isSyncing}
        participants={session.participants}
      />

      {/* Main content - responsive layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Code editor - takes full width on mobile, flex-1 on desktop */}
        <motion.div
          className="flex-1 min-w-0 h-[50vh] lg:h-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CodeEditor
            code={session.code}
            language={session.language}
            onChange={updateCode}
            onExecute={executeCode}
          />
        </motion.div>

        {/* Output panel - full width on mobile, fixed width on desktop */}
        <motion.div
          className="w-full lg:w-96 h-[50vh] lg:h-full flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <OutputPanel result={executionResult} isExecuting={isExecuting} />
        </motion.div>
      </div>
    </div>
  );
}
