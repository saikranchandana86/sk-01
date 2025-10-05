import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useAppStore } from '../../store/useAppStore';

interface ChartSeriesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ChartSeriesEditor: React.FC<ChartSeriesEditorProps> = ({ value, onChange, placeholder }) => {
  const { apis, sqlQueries } = useAppStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;

    // Register completion provider for autocomplete
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

        // Check if we're typing after {{
        if (textUntilPosition.includes('{{') && !textUntilPosition.endsWith('}}')) {
          const afterBraces = textUntilPosition.split('{{').pop() || '';

          // If just opened braces or typing API/query name
          if (!afterBraces.includes('.')) {
            // Suggest APIs
            apis.forEach(api => {
              const hasData = api.response?.body || api.response;
              suggestions.push({
                label: api.id,
                kind: monacoInstance.languages.CompletionItemKind.Variable,
                insertText: api.id,
                detail: `API: ${api.name}`,
                documentation: `${api.method} ${api.url}\n${hasData ? '✓ Has data' : '⚠ No data yet - Run API first'}`,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column - afterBraces.length,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });

            // Suggest SQL Queries
            sqlQueries.forEach(query => {
              const hasData = query.result && query.result.length > 0;
              suggestions.push({
                label: query.id,
                kind: monacoInstance.languages.CompletionItemKind.Variable,
                insertText: query.id,
                detail: `Query: ${query.name}`,
                documentation: `${query.query}\n${hasData ? '✓ Has data' : '⚠ No data yet - Run query first'}`,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column - afterBraces.length,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              });
            });
          }

          // If typing after API/query name with dot
          const parts = afterBraces.split('.');
          if (parts.length === 1 && afterBraces.endsWith('.')) {
            // Suggest .data, .response, .isLoading, .error
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

          // If we have .data, suggest array methods
          if (afterBraces.includes('.data') && parts.length >= 2) {
            const arrayMethods = [
              {
                label: 'map',
                insertText: 'map(item => ({ x: item.${1:label}, y: item.${2:value} }))',
                detail: 'Transform array',
                documentation: 'Transform each item in the array to chart format {x, y}',
              },
              {
                label: 'filter',
                insertText: 'filter(item => item.${1:field} ${2:===} ${3:value})',
                detail: 'Filter array',
                documentation: 'Filter items based on a condition',
              },
              {
                label: 'slice',
                insertText: 'slice(${1:0}, ${2:10})',
                detail: 'Get subset',
                documentation: 'Get a portion of the array',
              },
              {
                label: 'sort',
                insertText: 'sort((a, b) => ${1:b.value - a.value})',
                detail: 'Sort array',
                documentation: 'Sort items in the array',
              },
              {
                label: 'reduce',
                insertText: 'reduce((acc, item) => { acc[item.${1:key}] = (acc[item.${1:key}] || 0) + item.${2:value}; return acc; }, {})',
                detail: 'Reduce/Aggregate',
                documentation: 'Aggregate array values into a single result',
              },
              {
                label: 'find',
                insertText: 'find(item => item.${1:id} === ${2:value})',
                detail: 'Find item',
                documentation: 'Find first matching item',
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

        // Add common chart data patterns as snippets
        if (textUntilPosition.trim() === '' || textUntilPosition === '{{') {
          const snippets = [
            {
              label: 'Map API data to chart',
              insertText: '{{${1:apiName}.data.map(item => ({ x: item.${2:labelField}, y: item.${3:valueField} }))}}',
              detail: 'Chart data from API',
              documentation: 'Transform API response to chart format',
            },
            {
              label: 'Map with date formatting',
              insertText: '{{${1:apiName}.data.map(item => ({ x: new Date(item.${2:timestamp}).toLocaleDateString(), y: item.${3:value} }))}}',
              detail: 'Chart with formatted dates',
              documentation: 'Transform timestamp data to readable dates',
            },
            {
              label: 'Filter and map data',
              insertText: '{{${1:apiName}.data.filter(item => item.${2:status} === \"${3:active}\").map(item => ({ x: item.${4:name}, y: item.${5:count} }))}}',
              detail: 'Filter then map',
              documentation: 'Filter data before charting',
            },
            {
              label: 'Top N items',
              insertText: '{{${1:apiName}.data.sort((a, b) => b.${2:value} - a.${2:value}).slice(0, ${3:10}).map(item => ({ x: item.${4:name}, y: item.${2:value} }))}}',
              detail: 'Sort and limit',
              documentation: 'Show top N values',
            },
            {
              label: 'Group and sum by category',
              insertText: '{{Object.entries(${1:apiName}.data.reduce((acc, item) => { const key = item.${2:category}; acc[key] = (acc[key] || 0) + item.${3:value}; return acc; }, {})).map(([x, y]) => ({ x, y }))}}',
              detail: 'Aggregate by category',
              documentation: 'Group and sum values by category',
            },
            {
              label: 'Simple static data',
              insertText: '[{ x: "${1:Label 1}", y: ${2:100} }, { x: "${3:Label 2}", y: ${4:200} }]',
              detail: 'Static chart data',
              documentation: 'Define chart data manually',
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

    // Add hover provider for documentation
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
    <div className="border border-gray-500 rounded overflow-hidden">
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
  );
};
