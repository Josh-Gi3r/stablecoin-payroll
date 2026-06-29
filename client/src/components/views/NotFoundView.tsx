import { Compass } from 'lucide-react';
import { EmptyState, PageContainer, Button } from '../ui';

interface NotFoundViewProps {
  onGoHome: () => void;
}

export default function NotFoundView({ onGoHome }: NotFoundViewProps) {
  return (
    <PageContainer>
      <EmptyState
        icon={<Compass className="w-7 h-7" />}
        title="Page not found"
        description="That nav item exists in the sidebar but the page hasn't been wired up yet, or the URL is wrong."
        action={{ label: 'Back to dashboard', onClick: onGoHome }}
      />
    </PageContainer>
  );
}
