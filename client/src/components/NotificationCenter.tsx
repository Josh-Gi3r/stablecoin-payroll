import { useState } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Payroll Completed',
    message: '230 employees paid, $3.1M sent via Settlement Protocol',
    timestamp: '2024-02-07 09:15',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Tax Filing Due',
    message: 'Quarterly tax payment due in 5 days (Apr 30)',
    timestamp: '2024-02-07 08:00',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'FX Rate Alert',
    message: 'USD/EUR rate improved to 1.095, good time to rebalance',
    timestamp: '2024-02-06 14:30',
    read: true,
  },
];

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" style={{ color: 'var(--warn)' }} />;
      case 'error':
        return <AlertCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />;
      default:
        return <Info className="w-5 h-5" style={{ color: 'var(--sky-600)' }} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold"
            style={{ background: 'var(--danger)', color: '#FFFFFF' }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-overlay)',
            zIndex: 'var(--z-notification)' as unknown as number,
          }}
        >
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 transition-colors cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: !notification.read ? 'var(--primary-soft)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (notification.read) e.currentTarget.style.background = 'var(--bg-surface-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = !notification.read ? 'var(--primary-soft)' : 'transparent';
                  }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{notification.title}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{notification.message}</p>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{notification.timestamp}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
