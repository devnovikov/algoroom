import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CommandLineIcon,
  CodeBracketIcon,
  UsersIcon,
  BoltIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useSession } from '../hooks';
import { Button } from '../components/ui';

const features = [
  {
    icon: CodeBracketIcon,
    title: 'Real-time Code Editing',
    description: 'Write and see changes instantly across all participants',
  },
  {
    icon: UsersIcon,
    title: 'Collaborative Sessions',
    description: 'Share a link and code together in real-time',
  },
  {
    icon: BoltIcon,
    title: 'Instant Execution',
    description: 'Run code with a single click and see results immediately',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Home() {
  const navigate = useNavigate();
  const { createSession, isLoading, error } = useSession();
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python'>('javascript');

  const handleCreateSession = async () => {
    try {
      const session = await createSession(selectedLanguage);
      navigate(`/session/${session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-500/10 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-teal-500/10 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="max-w-xl w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo and title */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <motion.div
              className="inline-flex w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 items-center justify-center shadow-2xl shadow-cyan-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CommandLineIcon className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                AlgoRoom
              </span>
            </h1>
            <p className="text-lg text-slate-400">
              Real-time collaborative coding interviews
            </p>
          </motion.div>

          {/* Main card */}
          <motion.div
            variants={itemVariants}
            className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 p-8"
          >
            <div className="space-y-6">
              {/* Language selector */}
              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Select Language
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <LanguageButton
                    language="javascript"
                    label="JavaScript"
                    selected={selectedLanguage === 'javascript'}
                    onClick={() => setSelectedLanguage('javascript')}
                  />
                  <LanguageButton
                    language="python"
                    label="Python"
                    selected={selectedLanguage === 'python'}
                    onClick={() => setSelectedLanguage('python')}
                  />
                </div>
              </div>

              {/* Create button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateSession}
                disabled={isLoading}
                loading={isLoading}
                iconRight={!isLoading && <ChevronRightIcon className="w-5 h-5" />}
                className="w-full text-base"
              >
                {isLoading ? 'Creating Session...' : 'Create New Session'}
              </Button>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}
            </div>

            {/* Divider */}
            <div className="my-8 border-t border-slate-800" />

            {/* Info */}
            <p className="text-slate-500 text-sm text-center">
              Create a session and share the link with your interview candidate.
              <br />
              Both of you can edit code in real-time.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            variants={itemVariants}
            className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50"
                whileHover={{ y: -2, borderColor: 'rgba(6, 182, 212, 0.3)' }}
                transition={{ duration: 0.2 }}
              >
                <feature.icon className="w-6 h-6 text-cyan-400 mb-3" />
                <h3 className="text-sm font-medium text-slate-200 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 text-center text-xs text-slate-600">
        Built for technical interviews
      </footer>
    </div>
  );
}

interface LanguageButtonProps {
  language: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function LanguageButton({ language, label, selected, onClick }: LanguageButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`
        relative px-4 py-3 rounded-lg border text-sm font-medium transition-colors
        ${
          selected
            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="font-mono text-xs opacity-60 mr-2">
        {language === 'javascript' ? 'JS' : 'PY'}
      </span>
      {label}
      {selected && (
        <motion.div
          layoutId="language-indicator"
          className="absolute inset-0 border-2 border-cyan-500 rounded-lg"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
