import { Button } from '@/components/ui/Button';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function ErrorFallback({ code, onRetry }: { code?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-danger-500">{code ?? 'Error'}</p>
      <Button onClick={onRetry}>{t('errorPage.retry')}</Button>
    </div>
  );
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; code?: string }
> {
  state = { hasError: false as boolean, code: undefined as string | undefined };

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, code: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          code={this.state.code}
          onRetry={() => this.setState({ hasError: false, code: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
