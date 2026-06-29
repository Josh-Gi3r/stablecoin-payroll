import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

interface MobileMenuProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export default function MobileMenu({ activeModule, setActiveModule }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleModuleChange = (module: string) => {
    setActiveModule(module);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg"
        style={{
          background: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
        }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(5, 10, 22, 0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div
          className="fixed left-0 top-0 h-screen z-50 md:hidden"
          style={{ width: 'min(280px, 86vw)' }}
        >
          <Sidebar activeModule={activeModule} setActiveModule={handleModuleChange} />
        </div>
      )}
    </>
  );
}
