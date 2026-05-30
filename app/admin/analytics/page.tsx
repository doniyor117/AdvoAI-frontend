'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function formatMs(ms: number): string {
    if (ms === null || ms === undefined) return '';
    if (ms < 1000) return `${ms} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(0);
    return `${m}m ${s}s`;
}

export default function AdminAnalytics() {
    const [chartData, setChartData] = useState<any[]>([]);
    const [routerStats, setRouterStats] = useState<any>(null);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [timeRange, setTimeRange] = useState('30d');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        // eslint-disable-next-line
        setIsLoading(true);

        async function fetchCharts() {
            try {
                const res = await authFetch(`/api/admin/stats/charts?range=${timeRange}`);
                if (res.ok && mounted) {
                    const data = await res.json();
                    setChartData(data.time_series);
                    setRouterStats(data.router_analytics);
                }
            } catch {
                // ignore
            }
        }

        async function fetchPerformance() {
            try {
                const res = await authFetch(`/api/admin/stats/performance?range=${timeRange}`);
                if (res.ok && mounted) {
                    const data = await res.json();
                    setPerformanceData(data.performance);
                }
            } catch {
                // ignore
            }
        }

        Promise.all([fetchCharts(), fetchPerformance()]).finally(() => {
            if (mounted) setIsLoading(false);
        });

        return () => { mounted = false; };
    }, [timeRange]);

    if (isLoading && chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Analytics</h1>
                    <p className="text-sm text-muted-foreground mt-1">Detailed usage and performance metrics</p>
                </div>
                <div className="w-full sm:w-48">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10m">Last 10 Minutes</SelectItem>
                            <SelectItem value="30m">Last 30 Minutes</SelectItem>
                            <SelectItem value="1h">Last Hour</SelectItem>
                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Performance Overview */}
            {performanceData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Average Router Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{performanceData.avg_router_time_ms} ms</div>
                            <div className="text-sm font-medium text-muted-foreground mt-0.5">{formatMs(performanceData.avg_router_time_ms)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Intent classification & search generation</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Average LLM Generation Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{performanceData.avg_llm_time_ms} ms</div>
                            <div className="text-sm font-medium text-muted-foreground mt-0.5">{formatMs(performanceData.avg_llm_time_ms)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Main response generation</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Message Volume</CardTitle>
                        <CardDescription>Messages sent over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                                    <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleDateString()} className="text-xs" />
                                    <YAxis allowDecimals={false} className="text-xs" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                        labelFormatter={(v) => new Date(v).toLocaleString()}
                                    />
                                    <Bar dataKey="message_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Active Users</CardTitle>
                        <CardDescription>Unique users over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                                    <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleDateString()} className="text-xs" />
                                    <YAxis allowDecimals={false} className="text-xs" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                        labelFormatter={(v) => new Date(v).toLocaleString()}
                                    />
                                    <Line type="monotone" dataKey="active_users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">RAG vs Conversational</CardTitle>
                        <CardDescription>Router Agent intent distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 flex items-center justify-center">
                        {routerStats && routerStats.total > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={Object.entries(routerStats.intents).map(([name, value]) => ({ name, value }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {Object.keys(routerStats.intents).map((key, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-muted-foreground text-sm">No router data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
