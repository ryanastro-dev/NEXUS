import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  /**
   * If true, the tooltip is currently active (hoverable). 
   * Useful when you only want to show the tooltip when an element is disabled.
   */
  active?: boolean;
}

export function Tooltip({ children, content, active = true }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      className="group relative flex w-full items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {/* 
        Wrap children in a span so hover events fire even if the child is a disabled button. 
        Disabled buttons in HTML don't fire mouse events.
      */}
      <span className="flex w-full cursor-not-allowed justify-center">
        {/* We disable pointer events on the child if we want the wrapper to catch them,
            but standard buttons might still block it. Using pointer-events-none on child when active 
            is a hack, but wrapping it is usually enough if it's disabled. */}
        <div className="w-full pointer-events-none *:pointer-events-auto">
          {children}
        </div>
      </span>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-10 z-50 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700 pointer-events-none"
          >
            {content}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
