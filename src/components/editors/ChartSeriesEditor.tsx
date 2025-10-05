import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Lightbulb } from 'lucide-react';

interface ChartSeriesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ChartSeriesEditor: React.FC<ChartSeriesEditorProps> = ({ value, onChange, placeholder }) => {
  const { apis, sqlQueries } = useAppStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showQuickTips, setShowQuickTips] = useState(false);

  const quickTips = [
    { title: 'Filter Data', example: '.filter(item => item.status === "active")' },
    { title: 'Sort Descending', example: '.sort((a, b) => b.value - a.value)' },
    { title: 'Top 10 Items', example: '.slice(0, 10)' },
    { title: 'Format Dates', example: '.map(item => ({ x: new Date(item.date).toLocaleDateString(), y: item.value }))' }
  ];

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;

    monacoInstance.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['{', '.', '['],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suggestions: monaco.languages.CompletionItem[] = [];

        if (textUntilPosition.includes('{{') && !textUntilPosition.endsWith('}}')) {
          const afterBraces = textUntilPosition.split('{{').pop() || '';

          if (!afterBraces.includes('.')) {
            apis.forEach(api => {
              const hasData = api.response?.body || api.response;
              const dataPreview = hasData && api.response?.body
                ? Array.isArray(api.response.body)
                  ? `Array with ${api.response.body.length} items`
                  : 'Object data'
                : 'No data';

              suggestions.push({
                label: api.id,
                kind: monacoInstance.languages.CompletionItemKind.Variable,
                insertText: api.id,
                detail: `${hasData ? '✓' : '⚠'} API: ${api.name}`,
                documentation: `${api.method} ${api.url}\n\nData: ${dataPreview}\n${hasData ? '✓ Ready to use' : '⚠ Run API first to see data'}`,
                sortText: hasData ? `0_${api.id}` : `1_${api.id}`,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column - afterBraces.length,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });

            sqlQueries.forEach(query => {
              const hasData = query.result && query.result.length > 0;
              const dataPreview = hasData
                ? `${query.result.length} rows returned`
                : 'No results';

              suggestions.push({
                label: query.id,
                kind: monacoInstance.languages.CompletionItemKind.Variable,
                insertText: query.id,
                detail: `${hasData ? '✓' : '⚠'} Query: ${query.name}`,
                documentation: `${query.query.substring(0, 100)}...\n\nData: ${dataPreview}\n${hasData ? '✓ Ready to use' : '⚠ Run query first to see data'}`,
                sortText: hasData ? `0_${query.id}` : `1_${query.id}`,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column - afterBraces.length,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });
          }

          const parts = afterBraces.split('.');
          if (parts.length === 1 && afterBraces.endsWith('.')) {
            const baseProps = [
              {
                label: 'data',
                insertText: 'data',
                detail: 'Response data',
                documentation: 'Access the response data from the API or query',
              },
              {
                label: 'response',
                insertText: 'response',
                detail: 'Full response',
                documentation: 'Access the full response object',
              },
              {
                label: 'isLoading',
                insertText: 'isLoading',
                detail: 'Loading state',
                documentation: 'Boolean indicating if the request is in progress',
              },
              {
                label: 'error',
                insertText: 'error',
                detail: 'Error message',
                documentation: 'Error message if the request failed',
              },
            ];

            baseProps.forEach(prop => {
              suggestions.push({
                label: prop.label,
                kind: monacoInstance.languages.CompletionItemKind.Property,
                insertText: prop.insertText,
                detail: prop.detail,
                documentation: prop.documentation,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });
          }

          if (afterBraces.includes('.data') && parts.length >= 2) {
            const arrayMethods = [
              {
                label: 'map',
                insertText: 'map(item => ({ x: item.${1:label}, y: item.${2:value} }))',
                detail: '✨ Transform to chart data',
                documentation: 'Transform each item in the array to chart format {x, y}\n\nExample: .map(item => ({ x: item.name, y: item.count }))',
              },
              {
                label: 'filter',
                insertText: 'filter(item => item.${1:status} ${2:===} "${3:active}")',
                detail: '🔍 Filter data',
                documentation: 'Filter items based on a condition\n\nExample: .filter(item => item.status === "active")',
              },
              {
                label: 'slice',
                insertText: 'slice(${1:0}, ${2:10})',
                detail: '✂ Limit results',
                documentation: 'Get a portion of the array (useful for Top N)\n\nExample: .slice(0, 10) // Get first 10 items',
              },
              {
                label: 'sort',
                insertText: 'sort((a, b) => ${1:b.value - a.value})',
                detail: '📊 Sort data',
                documentation: 'Sort items in the array\n\nExample: .sort((a, b) => b.value - a.value) // Descending',
              },
              {
                label: 'reduce',
                insertText: 'reduce((acc, item) => { acc[item.${1:category}] = (acc[item.${1:category}] || 0) + item.${2:value}; return acc; }, {})',
                detail: '🔢 Aggregate/Group',
                documentation: 'Aggregate array values by category\n\nUseful for grouping and summing data',
              },
              {
                label: 'find',
                insertText: 'find(item => item.${1:id} === ${2:value})',
                detail: '🎯 Find specific item',
                documentation: 'Find first matching item\n\nExample: .find(item => item.id === 5)',
              },
            ];

            arrayMethods.forEach(method => {
              suggestions.push({
                label: method.label,
                kind: monacoInstance.languages.CompletionItemKind.Method,
                insertText: method.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: method.detail,
                documentation: method.documentation,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });
          }
        }

        if (textUntilPosition.trim() === '' || textUntilPosition === '{{') {
          const snippets = [
            {
              label: '🎨 Basic API to Chart',
              insertText: '{{${1:apiName}.data.map(item => ({ x: item.${2:labelField}, y: item.${3:valueField} }))}}',
              detail: 'Most common pattern',
              documentation: 'Transform API response to chart format\n\nUse this for simple data visualization',
            },
            {
              label: '📅 Chart with Date Formatting',
              insertText: '{{${1:apiName}.data.map(item => ({ x: new Date(item.${2:timestamp}).toLocaleDateString(), y: item.${3:value} }))}}',
              detail: 'Format timestamps',
              documentation: 'Transform timestamp data to readable dates\n\nGreat for time-series data',
            },
            {
              label: '🔍 Filter then Chart',
              insertText: '{{${1:apiName}.data.filter(item => item.${2:status} === "${3:active}").map(item => ({ x: item.${4:name}, y: item.${5:count} }))}}',
              detail: 'Show filtered data',
              documentation: 'Filter data before charting\n\nUseful for conditional visualization',
            },
            {
              label: '🏆 Top N Items',
              insertText: '{{${1:apiName}.data.sort((a, b) => b.${2:value} - a.${2:value}).slice(0, ${3:10}).map(item => ({ x: item.${4:name}, y: item.${2:value} }))}}',
              detail: 'Best performers',
              documentation: 'Show top N values\n\nPerfect for leaderboards and rankings',
            },
            {
              label: '📊 Group and Sum',
              insertText: '{{Object.entries(${1:apiName}.data.reduce((acc, item) => { const key = item.${2:category}; acc[key] = (acc[key] || 0) + item.${3:value}; return acc; }, {})).map(([x, y]) => ({ x, y }))}}',
              detail: 'Aggregate by category',
              documentation: 'Group and sum values by category\n\nIdeal for category-based analysis',
            },
            {
              label: '💾 Static Data',
              insertText: '[{ x: "${1:Label 1}", y: ${2:100} }, { x: "${3:Label 2}", y: ${4:200} }, { x: "${5:Label 3}", y: ${6:300} }]',
              detail: 'Manual data entry',
              documentation: 'Define chart data manually\n\nUseful for testing and prototyping',
            },
          ];

          snippets.forEach(snippet => {
            suggestions.push({
              label: snippet.label,
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: snippet.insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: snippet.detail,
              documentation: snippet.documentation,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            });
          });
        }

        return {
          suggestions,
        };
      },
    });

    monacoInstance.languages.registerHoverProvider('javascript', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const api = apis.find(a => a.id === word.word);
        if (api) {
          const hasData = api.response?.body || api.response;
          return {
            contents: [
              { value: `**API: ${api.name}**` },
              { value: `\`${api.method} ${api.url}\`` },
              { value: hasData ? '✓ Has data' : '⚠ No data yet - Run API first' },
            ],
          };
        }

        const query = sqlQueries.find(q => q.id === word.word);
        if (query) {
          const hasData = query.result && query.result.length > 0;
          return {
            contents: [
              { value: `**Query: ${query.name}**` },
              { value: `\`\`\`sql\n${query.query}\n\`\`\`` },
              { value: hasData ? '✓ Has data' : '⚠ No data yet - Run query first' },
            ],
          };
        }

        return null;
      },
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowQuickTips(!showQuickTips)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-md hover:from-blue-600 hover:to-cyan-600 transition-all shadow-sm hover:shadow-md"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        <span>Quick Tips</span>
      </button>

      {showQuickTips && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          {quickTips.map((tip, idx) => (
            <button
              key={idx}
              onClick={() => {
                const currentValue = editorRef.current?.getValue() || '';
                onChange(currentValue + tip.example);
              }}
              className="text-left p-2 bg-white rounded border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all group"
            >
              <div className="text-xs font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{tip.title}</div>
              <code className="text-xs text-gray-600 break-all">{tip.example}</code>
            </button>
          ))}
        </div>
      )}

      <div className="border border-gray-500 rounded overflow-hidden shadow-sm">
        <Editor
          height="80px"
          defaultLanguage="javascript"
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'none',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            wordWrap: 'on',
            suggest: {
              showWords: false,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            tabCompletion: 'on',
            placeholder: placeholder || 'Enter chart data binding...',
          }}
        />
      </div>
    </div>
  );
};
