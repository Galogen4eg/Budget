import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

const AIChatChart = ({ chartData }: { chartData: any }) => {
    if (!chartData || !chartData.type || !chartData.data) return null;

    return (
        <div className="w-full h-48 my-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
                {chartData.type === 'pie' ? (
                    <PieChart>
                        <Pie
                            data={chartData.data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            label
                        >
                            {chartData.data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                ) : (
                    <BarChart data={chartData.data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

export default AIChatChart;
