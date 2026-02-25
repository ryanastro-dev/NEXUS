import { User, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../../hooks/useLanguage';

interface AdminProfileProps {
  avatar?: string;
  name?: string;
  license?: string;
  isCollapsed?: boolean;
}

export default function AdminProfile({ 
  avatar, 
  name,
  license,
  isCollapsed = false,
}: AdminProfileProps) {
  const { copy } = useLanguage();
  const adminCopy = copy.common.adminProfile;
  const accessibilityCopy = copy.common.accessibility;
  const resolvedName = name ?? adminCopy.defaultName;
  const resolvedLicense = license ?? adminCopy.proLicense;

  return (
    <div className="mt-auto h-[88px] border-t border-theme p-3">
      <div className={clsx('relative flex h-full items-center', isCollapsed ? 'justify-center' : 'justify-start')}>
        {/* Avatar */}
        <div className="relative group">
          {avatar ? (
            <img 
              src={avatar} 
              alt={resolvedName}
              className="h-9 w-9 rounded-full object-cover border-2 border-bg-tertiary"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-sapphire flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-accent-green border-2 border-bg-secondary rounded-full"></span>
          
          {/* Tooltip when collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 bottom-0 px-3 py-2 bg-bg-elevated border border-theme rounded-md
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                            whitespace-nowrap text-sm shadow-lg z-50">
              <p className="text-text-primary font-semibold">{resolvedName}</p>
              <span className="text-xs text-accent-blue">{resolvedLicense}</span>
            </div>
          )}
        </div>

        <div
          className={clsx(
            'absolute inset-y-0 left-9 right-0 flex items-center justify-between pl-2.5',
            'transition-opacity duration-120 ease-out',
            isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
          )}
          aria-hidden={isCollapsed}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary truncate">
              {resolvedName}
            </p>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-accent-blue/10 text-accent-blue">
              {resolvedLicense}
            </span>
          </div>

          <button
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-bg-hover"
            aria-label={accessibilityCopy.userMenu}
          >
            <MoreVertical className="h-4 w-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}
