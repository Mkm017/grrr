import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../lib/api'

type MonthlyCalorieOrderRow = {
    orderId: string
    createdAt: string
    restaurantName: string
    calories: number
    subtotal: number
    deliveryFee: number
    discount: number
    total: number
    itemCount: number
}

type MonthlyCalorieResponse = {
    month: string
    summary: {
        totalCalories: number
        orderCount: number
        averageCalories: number
    }
    orders: MonthlyCalorieOrderRow[]
    dailyCalories: { date: string; calories: number }[]
}

function formatMonthLabel(month: string) {
    const [year, monthIndex] = month.split('-').map(Number)
    return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function formatPrice(cents: number) {
    return `₹${(cents / 100 * 83).toFixed(0)}`
}

function centsToInr(cents: number) {
    return Math.round((cents / 100) * 83)
}

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7)
}

export default function CalorieDashboard() {
    const { firebaseUser, dbUser } = useAuth()
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [data, setData] = useState<MonthlyCalorieResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0)

    useEffect(() => {
        if (!firebaseUser && !dbUser) return

        let active = true
        const load = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await api.get<MonthlyCalorieResponse>(`/orders/monthly-calories?month=${selectedMonth}`)
                if (active) setData(response)
            } catch (err: any) {
                if (active) setError(err.message || 'Failed to load calorie dashboard')
            } finally {
                if (active) setLoading(false)
            }
        }

        load()
        return () => { active = false }
    }, [selectedMonth, firebaseUser, dbUser])

    const peakDay = useMemo(() => {
        if (!data?.dailyCalories?.length) return null
        return [...data.dailyCalories].sort((a, b) => b.calories - a.calories)[0]
    }, [data])

    const spendSummary = useMemo(() => {
        const orders = data?.orders || []
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
        const totalSpentInr = centsToInr(totalSpent)
        const totalOrders = orders.length
        const averageOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0

        const restaurantTotals = new Map<string, { count: number; spent: number }>()
        for (const order of orders) {
            const current = restaurantTotals.get(order.restaurantName) || { count: 0, spent: 0 }
            restaurantTotals.set(order.restaurantName, {
                count: current.count + 1,
                spent: current.spent + order.total,
            })
        }

        const topRestaurantEntry = Array.from(restaurantTotals.entries())
            .sort((a, b) => b[1].count - a[1].count || b[1].spent - a[1].spent)[0]

        const healthiestOrders = [...orders]
            .sort((a, b) => a.calories - b.calories)
            .slice(0, 5)

        const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - totalSpentInr : 0
        const budgetUsage = monthlyBudget > 0 ? Math.min(100, (totalSpentInr / monthlyBudget) * 100) : 0

        return {
            totalSpent,
            totalSpentInr,
            totalOrders,
            averageOrderValue,
            topRestaurant: topRestaurantEntry ? {
                name: topRestaurantEntry[0],
                count: topRestaurantEntry[1].count,
                spent: topRestaurantEntry[1].spent,
            } : null,
            healthiestOrders,
            budgetRemaining,
            budgetUsage,
        }
    }, [data, monthlyBudget])

    useEffect(() => {
        const savedBudget = localStorage.getItem(`grrr_monthly_budget_${selectedMonth}`)
        setMonthlyBudget(savedBudget ? Number(savedBudget) : 0)
    }, [selectedMonth])

    const handleBudgetChange = (value: string) => {
        const nextBudget = Number(value) || 0
        setMonthlyBudget(nextBudget)
        localStorage.setItem(`grrr_monthly_budget_${selectedMonth}`, String(nextBudget))
    }

    const handleExport = () => {
        if (!data) return

        const workbook = XLSX.utils.book_new()

        const summarySheet = XLSX.utils.json_to_sheet([
            { Metric: 'Month', Value: formatMonthLabel(data.month) },
            { Metric: 'Total Calories', Value: data.summary.totalCalories },
            { Metric: 'Delivered Orders', Value: data.summary.orderCount },
            { Metric: 'Average Calories / Order', Value: data.summary.averageCalories },
            { Metric: 'Total Spend (INR)', Value: centsToInr(data.orders.reduce((sum, order) => sum + order.total, 0)) },
            { Metric: 'Budget (INR)', Value: monthlyBudget || 'Not set' },
            { Metric: 'Peak Day', Value: peakDay ? `${peakDay.date} (${peakDay.calories} kcal)` : 'N/A' },
        ])

        const ordersSheet = XLSX.utils.json_to_sheet(data.orders.map(order => ({
            Date: new Date(order.createdAt).toLocaleDateString('en-IN'),
            Restaurant: order.restaurantName,
            Calories: order.calories,
            Items: order.itemCount,
            Subtotal: formatPrice(order.subtotal),
            Delivery: order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee),
            Discount: formatPrice(order.discount),
            Total: formatPrice(order.total),
        })))

        const dailySheet = XLSX.utils.json_to_sheet(data.dailyCalories.map(day => ({
            Date: day.date,
            Calories: day.calories,
        })))

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
        XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Orders')
        XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Calories')
        XLSX.writeFile(workbook, `grrr-calorie-dashboard-${data.month}.xlsx`)
    }

    if (!firebaseUser && !dbUser) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 520, margin: '2rem auto' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
                <h2>Sign in to view your calorie dashboard</h2>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="insights-hero card" style={{ marginBottom: '1.5rem' }}>
                <div className="insights-hero-content">
                    <div className="insights-kicker">Monthly performance</div>
                    <h1 className="insights-title">Monthly Insights</h1>
                    <p className="insights-subtitle">Calories, budget, order analytics, and healthy meal picks from your delivered orders.</p>
                    <div className="insights-chips">
                        <span className="insights-chip">{formatMonthLabel(selectedMonth)}</span>
                        <span className="insights-chip insights-chip-soft">{data?.summary.orderCount || 0} delivered orders</span>
                        <span className="insights-chip insights-chip-soft">{data?.summary.totalCalories || 0} kcal tracked</span>
                    </div>
                </div>
                <div className="insights-toolbar">
                    <label className="form-group" style={{ minWidth: 180 }}>
                        <span className="form-label">Month</span>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="form-input"
                        />
                    </label>
                    <button className="btn btn-primary" onClick={handleExport} disabled={!data || loading}>
                        Export Excel
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div className="spinner" />
                </div>
            ) : data ? (
                <>
                    <div className="insights-metric-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="insights-metric-card">
                            <div className="insights-metric-icon">📅</div>
                            <div>
                                <div className="insights-metric-label">Month</div>
                                <div className="insights-metric-value">{formatMonthLabel(data.month)}</div>
                            </div>
                        </div>
                        <div className="insights-metric-card">
                            <div className="insights-metric-icon">🔥</div>
                            <div>
                                <div className="insights-metric-label">Calories</div>
                                <div className="insights-metric-value">{data.summary.totalCalories} kcal</div>
                            </div>
                        </div>
                        <div className="insights-metric-card">
                            <div className="insights-metric-icon">🧾</div>
                            <div>
                                <div className="insights-metric-label">Delivered Orders</div>
                                <div className="insights-metric-value">{data.summary.orderCount}</div>
                            </div>
                        </div>
                        <div className="insights-metric-card">
                            <div className="insights-metric-icon">🍽️</div>
                            <div>
                                <div className="insights-metric-label">Average / Order</div>
                                <div className="insights-metric-value">{data.summary.averageCalories} kcal</div>
                            </div>
                        </div>
                    </div>

                    <div className="insights-banner card" style={{ marginBottom: '1.5rem' }}>
                        <div className="insights-banner-copy">
                            <div className="insights-banner-label">Budget Planner</div>
                            <h3>Track spend against a monthly INR budget</h3>
                            <p>Set a target, watch the usage bar fill up, and export the exact numbers whenever you need them.</p>
                        </div>
                        <div className="insights-banner-side">
                            <label className="form-group" style={{ minWidth: 220, marginBottom: '0.75rem' }}>
                                <span className="form-label">Monthly Budget (INR)</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Set your monthly budget"
                                    value={monthlyBudget || ''}
                                    onChange={e => handleBudgetChange(e.target.value)}
                                    className="form-input"
                                />
                            </label>
                            <div className="insights-progress-track">
                                <div className="insights-progress-fill" style={{ width: `${spendSummary.budgetUsage}%` }} />
                            </div>
                            <div className="insights-budget-row">
                                <span>Spent</span>
                                <strong>₹{spendSummary.totalSpentInr}</strong>
                            </div>
                            <div className="insights-budget-row">
                                <span>Remaining</span>
                                <strong>{monthlyBudget > 0 ? `₹${Math.max(0, spendSummary.budgetRemaining)}` : 'Set budget'}</strong>
                            </div>
                            <div className="insights-budget-row">
                                <span>Usage</span>
                                <strong>{monthlyBudget > 0 ? `${spendSummary.budgetUsage.toFixed(0)}%` : '0%'}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="insights-split-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="card insights-panel-card">
                            <div className="insights-panel-head">
                                <div>
                                    <h3>Order Analytics</h3>
                                    <p>See where your orders are concentrated this month.</p>
                                </div>
                                <div className="insights-panel-badge">Top usage</div>
                            </div>
                            <div className="insights-mini-grid">
                                <div className="insights-mini-card">
                                    <div className="insights-mini-label">Orders</div>
                                    <div className="insights-mini-value">{spendSummary.totalOrders}</div>
                                </div>
                                <div className="insights-mini-card">
                                    <div className="insights-mini-label">Average Spend</div>
                                    <div className="insights-mini-value">{formatPrice(spendSummary.averageOrderValue)}</div>
                                </div>
                                <div className="insights-mini-card insights-mini-card-wide">
                                    <div className="insights-mini-label">Most Ordered Restaurant</div>
                                    <div className="insights-mini-value">{spendSummary.topRestaurant?.name || 'No restaurant yet'}</div>
                                    {spendSummary.topRestaurant && (
                                        <div className="insights-mini-note">
                                            {spendSummary.topRestaurant.count} orders • {formatPrice(spendSummary.topRestaurant.spent)} spent
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card insights-panel-card">
                            <div className="insights-panel-head">
                                <div>
                                    <h3>Healthy Meals</h3>
                                    <p>Your lightest delivered orders this month.</p>
                                </div>
                                <div className="insights-panel-badge positive">Low calorie</div>
                            </div>
                            {spendSummary.healthiestOrders.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No delivered orders to analyze yet.</p>
                            ) : (
                                <div className="insights-list">
                                    {spendSummary.healthiestOrders.map(order => (
                                        <div key={order.orderId} className="insights-list-row">
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{order.restaurantName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 800 }}>{order.calories} kcal</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.itemCount} items</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid-2col" style={{ alignItems: 'start' }}>
                        <div className="card insights-panel-card">
                            <div className="insights-panel-head" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3>Daily Calories</h3>
                                    <p>Each bar shows your estimated intake by day.</p>
                                </div>
                            </div>
                            {data.dailyCalories.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No delivered orders in this month yet.</p>
                            ) : (
                                <div className="insights-bars">
                                    {data.dailyCalories.map(day => {
                                        const maxCalories = Math.max(...data.dailyCalories.map(item => item.calories), 1)
                                        return (
                                            <div key={day.date} className="insights-bar-row">
                                                <span className="insights-bar-date">{day.date}</span>
                                                <div className="insights-bar-track">
                                                    <div className="insights-bar-fill" style={{ width: `${(day.calories / maxCalories) * 100}%` }} />
                                                </div>
                                                <strong className="insights-bar-value">{day.calories}</strong>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="card insights-panel-card">
                            <div className="insights-panel-head" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3>Top Delivery Day</h3>
                                    <p>Your highest intake day in the selected month.</p>
                                </div>
                            </div>
                            {peakDay ? (
                                <div className="insights-peak-card">
                                    <div className="insights-peak-label">Highest Intake</div>
                                    <div className="insights-peak-value">{peakDay.calories} kcal</div>
                                    <div className="insights-peak-date">{peakDay.date}</div>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>No peaks to show yet.</p>
                            )}

                            <h3 style={{ margin: '1.5rem 0 1rem', fontFamily: 'var(--font-display)' }}>Orders This Month</h3>
                            {data.orders.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No delivered orders found.</p>
                            ) : (
                                <div className="insights-list">
                                    {data.orders.slice(0, 8).map(order => (
                                        <div key={order.orderId} className="insights-list-row">
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{order.restaurantName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 800 }}>{order.calories} kcal</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.itemCount} items</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    )
}