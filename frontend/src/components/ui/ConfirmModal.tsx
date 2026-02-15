'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onCancel}>
            <div
                className="bg-popover border border-border rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Decoration */}
                <div className={`h-1 w-full ${variant === 'danger' ? 'bg-destructive/50' : 'bg-blue-500/50'}`} />

                <div className="p-8">
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className={`p-4 rounded-2xl mb-6 ${variant === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-blue-500/10 text-blue-500'}`}>
                            <AlertTriangle className="w-8 h-8" />
                        </div>

                        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                            {message}
                        </p>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 rounded-2xl border border-border text-muted-foreground font-medium hover:bg-accent hover:text-foreground transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${variant === 'danger'
                                    ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/20'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
