// Mock toast module to allow builds to succeed
export const toast = {
  success: (msg: string) => console.log('Success:', msg),
  error: (msg: string) => console.error('Error:', msg),
  loading: (msg: string) => console.log('Loading:', msg),
  promise: (promise: Promise<any>, msgs: { loading: string; success: string; error: string }) => {
    console.log('Promise started:', msgs.loading);
    promise.then(() => console.log('Promise success:', msgs.success)).catch(() => console.error('Promise error:', msgs.error));
  }
};

export const Toaster: React.FC<{ position?: string }> = () => null;

export default toast;
