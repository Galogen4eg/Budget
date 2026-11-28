import React from 'react';
import {createPortal} from 'react-dom';
import {motion,useReducedMotion} from 'framer-motion';
import AIChat from './AIChat';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import {useModalSurface} from '../hooks/useDialogFocus';
import useModalBackHandler from '../hooks/useModalBackHandler';
import {useMobileViewport} from '../hooks/useMobileViewport';
import {terraTransition} from '../utils/uiMotion';

interface AIChatModalProps {
  onClose: () => void;
  onOpenSettings?: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({onClose,onOpenSettings}) => {
  useBodyScrollLock();
  useModalBackHandler(true,onClose);
  const surface=useModalSurface(onClose,{initialSelector:'[aria-label="Закрыть чат"]'});
  const reduced=Boolean(useReducedMotion());
  const viewport=useMobileViewport();

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6"
      style={viewport.height===null?undefined:{height:viewport.height,bottom:'auto'}}>
      <motion.div initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        transition={terraTransition(reduced,.18)} onClick={onClose} aria-hidden="true"
        className="absolute inset-0 bg-black/40"/>
      <motion.div {...surface} role="dialog" aria-modal="true" aria-label="ИИ-помощник"
        data-testid="terra-ai-dialog" data-terra-settle-panel
        initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
        transition={terraTransition(reduced,.20)}
        className="relative bg-[var(--terra-surface)] text-[var(--terra-ink)] w-full max-w-[860px] h-full md:h-[700px] max-h-full md:max-h-[90dvh] md:rounded-2xl md:border border-[var(--terra-border)] shadow-lg overflow-hidden flex flex-col min-h-0"
        onClick={e=>e.stopPropagation()}>
        <AIChat onClose={onClose} onOpenSettings={onOpenSettings}/>
      </motion.div>
    </div>,document.body
  );
};
export default AIChatModal;
