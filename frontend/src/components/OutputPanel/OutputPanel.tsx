import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../ui';
import type { ExecutionResult } from '../../api';

interface OutputPanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}

export const OutputPanel = memo(function OutputPanel({ result, isExecuting }: OutputPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-full flex flex-col shadow-lg shadow-black/30">
      {/* Header */}
      <div className="bg-slate-800/50 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Output</h3>
        </div>

        {/* Status indicator */}
        <AnimatePresence mode="wait">
          {isExecuting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <LoadingSpinner size={14} />
              <span className="text-xs text-slate-400">Running...</span>
            </motion.div>
          )}
          {!isExecuting && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              {result.success ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              ) : (
                <ExclamationCircleIcon className="w-4 h-4 text-rose-400" />
              )}
              <span className={`text-xs ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.success ? 'Success' : 'Error'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 font-mono text-sm overflow-auto">
        <AnimatePresence mode="wait">
          {isExecuting ? (
            <motion.div
              key="executing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-slate-400"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <motion.div
                  className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <span className="text-sm">Executing code...</span>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {result.success ? (
                <pre className="text-emerald-300 whitespace-pre-wrap break-words">
                  {result.output || (
                    <span className="text-slate-500 italic">(no output)</span>
                  )}
                </pre>
              ) : (
                <pre className="text-rose-300 whitespace-pre-wrap break-words">
                  {result.error}
                </pre>
              )}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-slate-500">
                <ClockIcon className="w-4 h-4" />
                <span className="text-xs">
                  Execution time: {result.executionTime}ms
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-slate-500"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <PlayIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm">Click "Run" to execute your code</p>
                <p className="text-xs text-slate-600 mt-1">
                  or press{' '}
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
                  </kbd>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
