/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface UiContract {
  id: string;
  boundedContext: string;
  aggregate: string;
  entity: string;
  name: string;
  status: 'aligned' | 'advisory' | 'critical';
  statement: string;
  outcome: string;
  invariants: string[];
  acceptance: string[];
  allowedFields: string[];
  readOnlyFields: string[];
  tags: string[];
  yamlPath: string;
  yamlRaw: string;
  codePath: string;
  code: string;
}

declare const __IDD_WORKSPACE_CONTRACTS__: UiContract[];
