'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`w-[calc(100%-2rem)] ${maxWidthClass} m-auto p-0 bg-white text-stone-800 rounded-3xl shadow-elevated border border-stone-200 overflow-hidden max-h-[90dvh] open:flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
        <h2 className="text-xl font-bold text-stone-800 tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
};
