
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Crosshair, Send, Check, List, Trash2, MousePointer2, Copy, Image as ImageIcon } from 'lucide-react';
import { FeedbackItem } from '../types';
import { addItem, deleteItem, subscribeToCollection } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const FeedbackTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [showList, setShowList] = useState(false);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ rect: DOMRect, tag: string, class: string, node: HTMLElement } | null>(null);
  const [comment, setComment] = useState('');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const { familyId, user } = useAuth();
  const { settings } = useData();

  // Load existing feedbacks
  useEffect(() => {
      if (!familyId) return;
      return subscribeToCollection(familyId, 'feedback', (data) => {
          setFeedbacks((data as FeedbackItem[]).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      });
  }, [familyId]);

  // Global Event Listeners for "Inspector Mode"
  useEffect(() => {
    if (!isActive) {
        setHoveredRect(null);
        return;
    }

    const handleMouseOver = (e: MouseEvent) => {
        if (selectedElement) return; // Freeze hover if modal is open
        const target = e.target as HTMLElement;
        // Ignore the feedback tool itself
        if (target.closest('#feedback-tool-root')) return;
        
        setHoveredRect(target.getBoundingClientRect());
    };

    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('#feedback-tool-root')) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = target.getBoundingClientRect();
        
        // Capture screenshot immediately
        html2canvas(target, { backgroundColor: null }).then(canvas => {
            const dataUrl = canvas.toDataURL('image/png');
            setScreenshotPreview(dataUrl);
        }).catch(err => {
            console.error("Screenshot failed:", err);
            setScreenshotPreview(null);
        });

        setSelectedElement({
            rect,
            tag: target.tagName,
            class: target.className,
            node: target
        });
        setHoveredRect(null); // Hide hover outline
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick, true); // Capture phase

    return () => {
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('click', handleClick, true);
    };
  }, [isActive, selectedElement]);

  const handleSubmit = async () => {
      if (!comment.trim() || !selectedElement) return;

      const item: FeedbackItem = {
          id: Date.now().toString(),
          comment: comment.trim(),
          elementTag: selectedElement.tag,
          elementClass: typeof selectedElement.class === 'string' ? selectedElement.class.substring(0, 100) : '',
          timestamp: new Date().toISOString(),
          status: 'open',
          path: window.location.pathname,
          screenshot: screenshotPreview || undefined
      };

      if (familyId) {
          await addItem(familyId, 'feedback', item);
      } else {
          // Local demo support
          setFeedbacks(prev => [item, ...prev]);
      }

      setComment('');
      setSelectedElement(null);
      setScreenshotPreview(null);
      setIsActive(false); // Exit mode after submitting
      toast.success('Баг-репорт сохранен');
  };

  const handleDelete = async (id: string) => {
      if (familyId) {
          await deleteItem(familyId, 'feedback', id);
      } else {
          setFeedbacks(prev => prev.filter(f => f.id !== id));
      }
  };

  const handleExportToAI = () => {
      if (feedbacks.length === 0) return;

      const report = feedbacks.map((f, i) => `
Bug #${i + 1}:
- Проблема: "${f.comment}"
- Элемент: <${f.elementTag.toLowerCase()} class="${f.elementClass}" />
- Экран: ${f.path}
${f.screenshot ? '- [Скриншот элемента прилагается]' : ''}
      `).join('\n');

      const prompt = `Я собрал список UI багов и правок через Feedback Tool. Пожалуйста, проанализируй классы и описания и предложи исправления кода:\n${report}`;

      navigator.clipboard.writeText(prompt);
      toast.success('Скопировано! Вставь это в чат с разработчиком.');
  };

  if (!user || !settings.showFeedbackTool) return null;

  return createPortal(
    <div id="feedback-tool-root" className="fixed inset-0 pointer-events-none z-[9999]">
      
      {/* 1. Highlight Overlay */}
      {hoveredRect && isActive && (
          <div 
            className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none transition-all duration-75 z-[9990]"
            style={{
                top: hoveredRect.top + window.scrollY,
                left: hoveredRect.left + window.scrollX,
                width: hoveredRect.width,
                height: hoveredRect.height,
            }}
          />
      )}

      {/* 2. Controls Button */}
      <div className="absolute bottom-24 right-4 pointer-events-auto flex flex-col gap-2 items-end">
          <AnimatePresence>
              {showList && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-80 max-h-96 overflow-y-auto mb-2 pointer-events-auto flex flex-col"
                  >
                      <div className="flex justify-between items-center mb-3 shrink-0">
                          <h3 className="font-bold text-sm dark:text-white">Баг-репорты ({feedbacks.length})</h3>
                          <div className="flex gap-1">
                              {feedbacks.length > 0 && (
                                  <button onClick={handleExportToAI} className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg hover:bg-blue-100" title="Скопировать для AI">
                                      <Copy size={14}/>
                                  </button>
                              )}
                              <button onClick={() => setShowList(false)} className="p-1.5 text-gray-400 hover:text-red-500"><X size={16}/></button>
                          </div>
                      </div>
                      
                      {feedbacks.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-8 text-gray-400 text-xs">Нет записей</div>
                      ) : (
                          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                              {feedbacks.map(f => (
                                  <div key={f.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl relative group border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-colors">
                                      <p className="text-xs font-bold text-[#1C1C1E] dark:text-white mb-1 leading-snug">{f.comment}</p>
                                      <div className="bg-gray-200 dark:bg-black/20 p-1.5 rounded-lg mb-1">
                                        <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 break-all leading-tight">
                                            {f.elementClass || 'No classes'}
                                        </p>
                                      </div>
                                      {f.screenshot && (
                                          <div className="mt-1 mb-1 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                                              <img src={f.screenshot} alt="Screenshot" className="w-full h-auto object-cover max-h-20" />
                                          </div>
                                      )}
                                      <p className="text-[9px] text-gray-400">{new Date(f.timestamp).toLocaleString()}</p>
                                      <button onClick={() => handleDelete(f.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="flex gap-2">
            <button 
                onClick={() => setShowList(!showList)} 
                className="w-12 h-12 bg-white dark:bg-[#2C2C2E] rounded-full shadow-lg flex items-center justify-center text-gray-500 dark:text-gray-300 pointer-events-auto active:scale-95 transition-transform border border-gray-100 dark:border-white/5"
                title="Список багов"
            >
                <List size={20} />
                {feedbacks.length > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#2C2C2E]" />}
            </button>
            <button 
                onClick={() => { setIsActive(!isActive); setSelectedElement(null); setScreenshotPreview(null); }} 
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center pointer-events-auto transition-all active:scale-95 border ${isActive ? 'bg-red-500 text-white animate-pulse border-red-600' : 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black border-transparent'}`}
                title="Режим инспектора"
            >
                {isActive ? <Crosshair size={24} /> : <Bug size={24} />}
            </button>
          </div>
      </div>

      {/* 3. Feedback Dialog */}
      <AnimatePresence>
          {selectedElement && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-auto p-4">
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedElement(null)} />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10"
                  >
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl">
                              <MousePointer2 size={20} />
                          </div>
                          <div>
                              <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Что здесь не так?</h3>
                              <p className="text-[10px] font-mono text-gray-400 truncate max-w-[200px]">
                                  &lt;{selectedElement.tag.toLowerCase()} /&gt;
                              </p>
                          </div>
                          <button onClick={() => setSelectedElement(null)} className="ml-auto text-gray-400 hover:text-red-500"><X size={20}/></button>
                      </div>

                      {/* Screenshot Preview */}
                      {screenshotPreview && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm relative group">
                              <img src={screenshotPreview} alt="Element screenshot" className="w-full h-auto max-h-32 object-contain bg-gray-50 dark:bg-black/20" />
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                                  <ImageIcon size={10} /> Скриншот
                              </div>
                          </div>
                      )}

                      <textarea 
                        autoFocus
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Опишите проблему, например: 'Кнопка слишком мелкая' или 'Текст не читается'..."
                        className="w-full h-32 bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl text-sm font-medium outline-none text-[#1C1C1E] dark:text-white resize-none mb-4 focus:ring-2 ring-blue-500/20 transition-all"
                      />

                      <button 
                        onClick={handleSubmit}
                        disabled={!comment.trim()}
                        className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                      >
                          <Send size={16} /> Сохранить репорт
                      </button>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Info Toast when active */}
      {isActive && !selectedElement && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full text-xs font-bold shadow-xl pointer-events-none animate-bounce z-[9990] flex items-center gap-2">
              <Crosshair size={16} />
              Нажмите на элемент с ошибкой
          </div>
      )}

    </div>
  , document.body);
};

export default FeedbackTool;
