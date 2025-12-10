import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  ClipboardIcon,
  CheckIcon,
  UserGroupIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Button, LoadingSpinner } from '../ui';

interface SessionControlsProps {
  sessionId: string;
  language: 'javascript' | 'python';
  onLanguageChange: (language: 'javascript' | 'python') => void;
  onExecute: () => void;
  isExecuting: boolean;
  isSyncing?: boolean;
  participants: number;
}

const languageIcons: Record<string, string> = {
  javascript: 'JS',
  python: 'PY',
};

export const SessionControls = memo(function SessionControls({
  sessionId,
  language,
  onLanguageChange,
  onExecute,
  isExecuting,
  isSyncing = false,
  participants,
}: SessionControlsProps) {
  const [copied, setCopied] = useState(false);

  const shareableLink = `${window.location.origin}/session/${sessionId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/50 px-4 py-3 border-b border-slate-700">
      {/* Left controls */}
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as 'javascript' | 'python')}
            className="appearance-none bg-slate-700 text-slate-100 pl-10 pr-8 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer transition-all text-sm font-medium"
            aria-label="Select language"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 font-mono">
            {languageIcons[language]}
          </span>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Run button */}
        <Button
          variant="success"
          size="md"
          onClick={onExecute}
          disabled={isExecuting}
          loading={isExecuting}
          icon={!isExecuting && <PlayIcon className="w-4 h-4" />}
        >
          {isExecuting ? 'Running...' : 'Run'}
        </Button>

        {/* Keyboard shortcut hint */}
        <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 font-mono">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
          </kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 font-mono">
            Enter
          </kbd>
        </span>

        {/* Sync indicator */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <LoadingSpinner size={12} />
              <span>Syncing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Participants */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <UserGroupIcon className="w-4 h-4" />
          <span className="text-sm">
            {participants} {participants === 1 ? 'participant' : 'participants'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* Share button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleCopyLink}
          icon={
            copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )
          }
        >
          {copied ? 'Copied!' : 'Share Link'}
        </Button>
      </div>
    </div>
  );
});
