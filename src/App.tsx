import React, { useState, useEffect } from 'react'

interface Transaction {
  type: 'income' | 'expense'
  amount: number
  category: string
  comment: string
  date: string
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [comment, setComment] = useState('')
  const [isDark, setIsDark] = useState(false)

  // Загрузка данных и темы
  useEffect(() => {
    const savedTx = localStorage.getItem('transactions')
    if (savedTx) setTransactions(JSON.parse(savedTx))

    const theme = localStorage.getItem('theme')
    const dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(dark)
    if (dark) document.documentElement.classList.add('dark')
  }, [])

  // Сохранение транзакций
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions))
  }, [transactions])

  const toggleTheme = () => {
    setIsDark(prev => {
      const newDark = !prev
      localStorage.setItem('theme', newDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', newDark)
      return newDark
    })
  }

  const addTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !category) return

    const newTx: Transaction = {
      type,
      amount: Number(amount),
      category,
      comment,
      date: new Date().toISOString().split('T')[0]
    }

    setTransactions(prev => [...prev, newTx])
    setAmount('')
    setCategory('')
    setComment('')
  }

  // Подсчёт за текущий месяц
  const now = new Date()
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок и тема */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-bold">Мой бюджет</h1>
          <button
            onClick={toggleTheme}
            className="p-4 text-2xl bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          >
            {isDark ? 'Солнце' : 'Луна'}
          </button>
        </div>

        {/* Карточки итогов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
            <div className="text-green-600 font-bold text-xl">Доходы</div>
            <div className="text-4xl font-bold mt-2">{income.toLocaleString()} ₽</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
            <div className="text-red-600 font-bold text-xl">Расходы</div>
            <div className="text-4xl font-bold mt-2">{expenses.toLocaleString()} ₽</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
            <div className={balance >= 0 ? 'text-green-600' : 'text-red-600'} font-bold text-xl>Остаток</div>
            <div className="text-4xl font-bold mt-2">{balance.toLocaleString()} ₽</div>
          </div>
        </div>

        {/* Форма добавления */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl mb-12">
          <h2 className="text-3xl font-bold mb-6">Добавить операцию</h2>
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <select value={type} onChange={e => setType(e.target.value as any)} className="p-4 text-lg border rounded-lg dark:bg-gray-700">
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>
            <input type="number" placeholder="Сумма" value={amount} onChange={e => setAmount(e.target.value)} required className="p-4 text-lg border rounded-lg dark:bg-gray-700" />
            <input type="text" placeholder="Категория" value={category} onChange={e => setCategory(e.target.value)} required className="p-4 text-lg border rounded-lg dark:bg-gray-700" />
            <input type="text" placeholder="Комментарий (необязательно)" value={comment} onChange={e => setComment(e.target.value)} className="p-4 text-lg border rounded-lg dark:bg-gray-700" />
            <button type="submit" className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-4 text-xl font-bold rounded-lg transition">
              Добавить
            </button>
          </form>
        </div>

        {/* Список операций */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-bold mb-6">Операции за этот месяц</h2>
          {monthTx.length === 0 ? (
            <p className="text-center text-gray-500 text-xl py-10">Пока нет операций</p>
          ) : (
            <div className="space-y-4">
              {monthTx.map((t, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <div className="text-xl font-semibold">{t.category}</div>
                    {t.comment && <div className="text-gray-500">{t.comment}</div>}
                  </div>
                  <div className={t.type === 'income' ? 'text-green-600' : 'text-red-600'} text-2xl font-bold>
                    {t.type === 'income' ? '+' : '−'} {t.amount.toLocaleString()} ₽
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}