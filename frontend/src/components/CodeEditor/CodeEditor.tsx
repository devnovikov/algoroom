import { memo, useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { keymap } from '@codemirror/view';

interface CodeEditorProps {
  code: string;
  language: 'javascript' | 'python';
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
}

const basicSetupConfig = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightSpecialChars: true,
  foldGutter: true,
  drawSelection: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  rectangularSelection: true,
  crosshairCursor: true,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
  closeBracketsKeymap: true,
  searchKeymap: true,
  foldKeymap: true,
  completionKeymap: true,
  lintKeymap: true,
};

export const CodeEditor = memo(function CodeEditor({
  code,
  language,
  onChange,
  onExecute,
  readOnly = false,
}: CodeEditorProps) {
  // Memoize language extensions
  const languageExtension = useMemo(() => {
    return language === 'javascript' ? javascript({ jsx: true }) : python();
  }, [language]);

  // Memoize keyboard shortcuts
  const customKeymap = useMemo(() => {
    if (!onExecute) return null;

    return keymap.of([
      {
        // Cmd/Ctrl + Enter to execute
        key: 'Mod-Enter',
        run: () => {
          onExecute();
          return true;
        },
      },
    ]);
  }, [onExecute]);

  // Memoize all extensions
  const extensions = useMemo(() => {
    if (customKeymap) {
      return [languageExtension, customKeymap];
    }
    return [languageExtension];
  }, [languageExtension, customKeymap]);

  // Stable onChange handler
  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg shadow-black/30">
      <CodeMirror
        key={language}
        value={code}
        height="100%"
        theme={vscodeDark}
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        className="h-full text-sm"
        basicSetup={basicSetupConfig}
      />
    </div>
  );
});
