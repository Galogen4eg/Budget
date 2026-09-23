
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Target, Calendar, Edit2, Trash2, X, Check, TrendingUp, DollarSign } from 'lucide-react';
import { Project, AppSettings, ProjectExpense } from '../types';
import { getIconById } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface Props {
  projects: Project[];
  setProjects: (p: Project[]) => void;
  settings: AppSettings;
}

const PRESET_COLORS = ['#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#1C1C1E'];
const PRESET_ICONS = ['Hammer', 'Plane', 'Gift', 'Baby', 'Car', 'Home', 'Star'];

const ProjectsApp: React.FC<Props> = ({ projects, setProjects, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { familyId } = useAuth();
  
  // Form State
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);

  // Expense State inside Project
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const activeProject = projects.find(p => p.id === viewProjectId);

  const handleSaveProject = async () => {
    if (!title.trim() || !budget) return;
    
    if (editingProject) {
        const updated = { 
            ...editingProject, 
            title, 
            totalBudget: Number(budget),
            color,
            icon
        };
        setProjects(projects.map(p => p.id === editingProject.id ? updated : p));
        if (familyId) await updateItem(familyId, 'projects', editingProject.id, updated);
    } else {
        const newProject: Project = {
            id: Date.now().toString(),
            title,
            totalBudget: Number(budget),
            currency: settings.currency,
            status: 'active',
            startDate: new Date().toISOString(),
            color,
            icon,
            expenses: []
        };
        setProjects([...projects, newProject]);
        if (familyId) await addItem(familyId, 'projects', newProject);
    }
    closeModal();
  };

  const handleAddExpense = async () => {
      if (!viewProjectId || !expenseTitle.trim() || !expenseAmount) return;
      
      const newExpense: ProjectExpense = {
          id: Date.now().toString(),
          title: expenseTitle,
          amount: Number(expenseAmount),
          date: new Date().toISOString(),
          memberId: 'unknown'
      };

      const project = projects.find(p => p.id === viewProjectId);
      if (!project) return;

      const updatedProject = {
          ...project,
          expenses: [newExpense, ...project.expenses]
      };
      
      setProjects(projects.map(p => p.id === viewProjectId ? updatedProject : p));
      if (familyId) await updateItem(familyId, 'projects', viewProjectId, { expenses: updatedProject.expenses });
      
      setExpenseTitle('');
      setExpenseAmount('');
  };

  const deleteExpense = async (projectId: string, expenseId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedExpenses = project.expenses.filter(e => e.id !== expenseId);
      const updatedProject = { ...project, expenses: updatedExpenses };

      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
      if (familyId) await updateItem(familyId, 'projects', projectId, { expenses: updatedExpenses });
  };

  const deleteProject = async (id: string) => {
      if(confirm('Удалить проект?')) {
          setProjects(projects.filter(p => p.id !== id));
          if (familyId) await deleteItem(familyId, 'projects', id);
          setViewProjectId(null);
          closeModal();
      }
  };

  const openEdit = (p: Project) => {
      setEditingProject(p);
      setTitle(p.title);
      setBudget(String(p.totalBudget));
      setColor(p.color);
      setIcon(p.icon);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingProject(null);
      setTitle('');
      setBudget('');
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0]);
  };

  return (
    <div className="space-y-6 w-full">
        <AnimatePresence mode="wait">
            {viewProjectId && activeProject ? (
                <motion.div 
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                >
                    {/* Detail Header */}
                    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5">
                        <div className="flex justify-between items-start mb-6">
                            <button onClick={() => setViewProjectId(null)} className="p-2 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3A3A3C]"><X size={20}/></button>
                            <button onClick={() => openEdit(activeProject)} className="p-2 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 size={20}/></button>
                        </div>
                        
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg" style={{ backgroundColor: activeProject.color }}>
                                {getIconById(activeProject.icon, 32)}
                            </div>
                            <h2 className="text-2xl font-black text-[#1C1C1E] dark:text-white">{activeProject.title}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Бюджет: {activeProject.totalBudget.toLocaleString()} {settings.currency}</p>
                        </div>

                        {/* Progress */}
                        {(() => {
                            const spent = activeProject.expenses.reduce((s,e) => s+e.amount, 0);
                            const progress = Math.min(100, (spent / activeProject.totalBudget) * 100);
                            const remain = activeProject.totalBudget - spent;
                            
                            return (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold px-1">
                                        <span className={progress > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}>{Math.round(progress)}%</span>
                                        <span className="text-gray-400">Осталось: {remain.toLocaleString()}</span>
                                    </div>
                                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${progress > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${progress}%`, backgroundColor: progress > 100 ? '#EF4444' : activeProject.color }} />
                                    </div>
                                    <div className="text-center pt-2">
                                        <span className="text-3xl font-black text-[#1C1C1E] dark:text-white">{spent.toLocaleString()}</span>
                                        <span className="text-sm font-bold text-gray-400 ml-1">{settings.currency}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Add Expense */}
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[2rem] shadow-sm dark:shadow-none border border-white dark:border-white/5 flex gap-2">
                        <input type="text" placeholder="Что купили?" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white" />
                        <input type="number" step="0.01" placeholder="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-20 bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white" />
                        <button onClick={handleAddExpense} className="w-12 bg-[#1C1C1E] dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center"><Plus size={20}/></button>
                    </div>

                    {/* History */}
                    <div className="space-y-2">
                        {activeProject.expenses.map(exp => (
                            <div key={exp.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none border border-gray-50 dark:border-white/5">
                                <div>
                                    <div className="font-bold text-sm text-[#1C1C1E] dark:text-white">{exp.title}</div>
                                    <div className="text-[10px] font-bold text-gray-400">{new Date(exp.date).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-[#1C1C1E] dark:text-white">{exp.amount}</span>
                                    <button onClick={() => deleteExpense(activeProject.id, exp.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xl text-[#1C1C1E] dark:text-white">Проекты</h3>
                            <button onClick={() => setIsModalOpen(true)} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Plus size={24}/></button>
                        </div>

                        {projects.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 font-bold text-xs uppercase">
                                Создайте проект<br/>для крупных целей
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {projects.map(project => {
                                    const spent = project.expenses.reduce((s,e) => s+e.amount, 0);
                                    const progress = Math.min(100, (spent / project.totalBudget) * 100);
                                    
                                    return (
                                        <div key={project.id} onClick={() => setViewProjectId(project.id)} className="bg-gray-50 dark:bg-[#2C2C2E] p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 cursor-pointer active:scale-98 transition-transform relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: project.color }}>
                                                        {getIconById(project.icon, 20)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-sm text-[#1C1C1E] dark:text-white">{project.title}</h4>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.status}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-[#1C1C1E] dark:text-white">{spent.toLocaleString()} / {project.totalBudget.toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative z-10">
                                                <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-md" onClick={closeModal} />
                    <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-xl text-[#1C1C1E] dark:text-white">{editingProject ? 'Настройки' : 'Новый проект'}</h3>
                            {editingProject && <button onClick={() => deleteProject(editingProject.id)} className="text-red-500"><Trash2 size={20}/></button>}
                        </div>
                        
                        <div className="space-y-3">
                            <input type="text" placeholder="Название (Ремонт кухни)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                            <input type="number" step="0.01" placeholder="Бюджет" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Цвет</label>
                            <div className="flex gap-2 mt-1 overflow-x-auto no-scrollbar">
                                {PRESET_COLORS.map(c => (
                                    <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full flex-shrink-0 transition-transform ${color === c ? 'scale-125 ring-2 ring-gray-200 dark:ring-gray-600' : ''}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Иконка</label>
                            <div className="flex gap-2 mt-1 overflow-x-auto no-scrollbar">
                                {PRESET_ICONS.map(i => (
                                    <button key={i} onClick={() => setIcon(i)} className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform ${icon === i ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400'}`}>
                                        {getIconById(i, 20)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSaveProject} className="w-full bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-xl font-black uppercase text-xs mt-2">Сохранить</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default ProjectsApp;
