import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Copy, Check, ExternalLink, RefreshCw, User, X } from 'lucide-react';

export interface AuthErrorInfo {
  code: string;
  title: string;
  description: string;
  actionHint: string;
  rawMessage: string;
}

interface AuthErrorModalProps {
  error: AuthErrorInfo | null;
  onClose: () => void;
  onRetry?: () => void;
  onEnterDemo?: () => void;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  error,
  onClose,
  onRetry,
  onEnterDemo
}) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const fullErrorText = `Код ошибки: ${error.code}\nЗаголовок: ${error.title}\nОписание: ${error.description}\nИнструкция: ${error.actionHint}\nТехнические детали: ${error.rawMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullErrorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-red-100 dark:border-red-900/30 relative overflow-hidden"
        >
          {/* Декоративная иконка */}
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="inline-block px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
              Причина ошибки Google Входа
            </div>
            <h3 className="text-xl font-extrabold leading-tight">{error.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              {error.description}
            </p>

            {/* Инструкция к решению */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-2xl space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                💡 Как это исправить:
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                {error.actionHint}
              </p>
            </div>

            {/* Код и техническая сводка */}
            <div className="bg-gray-100 dark:bg-[#2C2C2E] p-3 rounded-xl space-y-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase font-sans font-bold">
                <span>Код ошибки:</span>
                <span className="text-red-500 font-mono">{error.code || 'UNKNOWN_ERROR'}</span>
              </div>
              <p className="truncate text-[10px] opacity-80" title={error.rawMessage}>
                {error.rawMessage}
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="mt-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className="py-3 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
              </button>

              {onRetry && (
                <button
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="py-3 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Попробовать снова</span>
                </button>
              )}
            </div>

            {onEnterDemo && (
              <button
                onClick={() => {
                  onClose();
                  onEnterDemo();
                }}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <User size={14} />
                <span>Войти в автономый демо-режим</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
