
window.openModal = (html, widthClass = 'max-w-lg') => { 
    const o = document.getElementById('modal-overlay'); 
    const c = document.getElementById('modal-content'); 
    c.className = `bg-white dark:bg-[#1C1C1E] w-full ${widthClass} rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-95 opacity-0 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto`;
    c.innerHTML = html; 
    o.classList.remove('hidden'); 
    setTimeout(() => { c.classList.remove('scale-95', 'opacity-0'); c.classList.add('scale-100', 'opacity-100'); }, 10); 
};
window.closeModal = () => { const o = document.getElementById('modal-overlay'); const c = document.getElementById('modal-content'); c.classList.remove('scale-100', 'opacity-100'); c.classList.add('scale-95', 'opacity-0'); setTimeout(() => o.classList.add('hidden'), 200); };

document.addEventListener('DOMContentLoaded', () => {
    DB.init();
    router.navigate('dashboard');
    updateNavigationVisibility();
});
