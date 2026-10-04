import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ui.jsx';

// const [confirm, dialog] = useConfirm();  ...  if (await confirm({ title, message, danger })) {...}  ...  {dialog}
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state.resolve(v); setState(null); };
  const dialog = state && <ConfirmDialog {...state} onConfirm={() => close(true)} onCancel={() => close(false)} />;
  return [confirm, dialog];
}
