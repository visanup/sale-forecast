import { ErrorLogProvider, useErrorLogContext } from '../contexts/ErrorLogContext';

export function useErrorLog() {
  return useErrorLogContext();
}

export { ErrorLogProvider };
