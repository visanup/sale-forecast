/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_DATA_URL: string
  readonly VITE_DIM_URL: string
  readonly VITE_INGEST_URL: string
  readonly VITE_DATA_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


