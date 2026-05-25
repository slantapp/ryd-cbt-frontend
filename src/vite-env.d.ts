/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Base URL for question images stored as relative paths (bulk upload Image column) */
  readonly VITE_QUESTION_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

