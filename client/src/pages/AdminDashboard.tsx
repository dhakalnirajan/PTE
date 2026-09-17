import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, CreditCard, BarChart3, Settings, LogOut,
  DollarSign, ShoppingCart, AlertCircle, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminAnalytics from "@/components/AdminAnalytics";

function formatCurrency(amount: number) {
  return `₨${amount.toLocaleString()}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const isAdmin = !!user && user.role === "admin";

  const statsQuery = trpc.systemAdmin.getSystemStats.useQuery(undefined, {
    enabled: isAdmin,
  });
  const revenueQuery = trpc.systemAdmin.getPaymentRevenue.useQuery(
    { days: 30 },
    { enabled: isAdmin }
  );
  const paymentsQuery = trpc.systemAdmin.getRecentPayments.useQuery(
    { limit: 10, offset: 0 },
    { enabled: isAdmin }
  );
  const healthQuery = trpc.systemAdmin.getSystemHealth.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  if (!user || user.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const stats = statsQuery.data;
  const revenue = revenueQuery.data;
  const payments = paymentsQuery.data?.transactions ?? [];

  const conversionRate =
    stats && stats.totalUsers > 0
      ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100)
      : 0;

  const revenueByMethod = revenue?.revenueByMethod ?? [];
  const totalMethodRevenue = revenueByMethod.reduce(
    (sum, item) => sum + Number(item.total ?? 0),
    0
  );

  const kpis = [
    {
      label: "Total Users",
      value: stats ? stats.totalUsers.toLocaleString() : "—",
      icon: Users,
      color: "bg-blue-500",
      detail: stats ? `${stats.activeUsers.toLocaleString()} active` : "",
    },
    {
      label: "Active Subscriptions",
      value: stats ? stats.activeSubscriptions.toLocaleString() : "—",
      icon: ShoppingCart,
      color: "bg-teal-500",
      detail: stats ? `${conversionRate}% conversion` : "",
    },
    {
      label: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : "—",
      icon: DollarSign,
      color: "bg-green-500",
      detail: "All time, completed payments",
    },
    {
      label: "Failed Payments",
      value: stats ? stats.failedPayments.toLocaleString() : "—",
      icon: AlertCircle,
      color: "bg-red-500",
      detail: "Requires review",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-slate-400">PTEMaster Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        {statsQuery.isError && (
          <Card className="bg-red-900/30 border-red-700 mb-6">
            <CardContent className="p-4 flex items-center gap-3 text-red-200">
              <AlertCircle className="w-5 h-5" />
              Couldn't load system statistics.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-slate-700 border-slate-600 hover:border-slate-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white flex items-center gap-2">
                        {statsQuery.isLoading && (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        )}
                        {stat.value}
                      </p>
                      {stat.detail && (
                        <p className="text-xs text-slate-500 mt-2">{stat.detail}</p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-700 border-slate-600">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Gateway */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Revenue by Gateway</CardTitle>
                  <CardDescription>Completed payments, last 30 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {revenueQuery.isLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  )}
                  {!revenueQuery.isLoading && revenueByMethod.length === 0 && (
                    <p className="text-sm text-slate-400">No completed payments yet.</p>
                  )}
                  {revenueByMethod.map((item, i) => {
                    const total = Number(item.total ?? 0);
                    const pct =
                      totalMethodRevenue > 0
                        ? Math.round((total / totalMethodRevenue) * 100)
                        : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-white font-medium capitalize">
                            {item.method}
                          </span>
                          <span className="text-sm text-teal-400">
                            {formatCurrency(total)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{pct}% of revenue</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Subscriptions by Plan */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Subscriptions by Plan</CardTitle>
                  <CardDescription>Active users per plan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {revenueQuery.isLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  )}
                  {!revenueQuery.isLoading &&
                    (revenue?.subscriptionBreakdown ?? []).length === 0 && (
                      <p className="text-sm text-slate-400">No active subscriptions yet.</p>
                    )}
                  {(revenue?.subscriptionBreakdown ?? []).map((plan, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-600 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{plan.plan}</p>
                        <p className="text-sm text-slate-400">{plan.count} users</p>
                      </div>
                      <Badge variant="default">
                        {formatCurrency(Number(plan.totalMrr ?? 0))} MRR
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">Recent Payments</CardTitle>
                <CardDescription>Latest 10 transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsQuery.isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                )}
                {!paymentsQuery.isLoading && payments.length === 0 && (
                  <p className="text-sm text-slate-400">No payments recorded yet.</p>
                )}
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {payment.userName ?? `User #${payment.userId}`}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">
                            {payment.gateway} • {formatDate(payment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">
                          {formatCurrency(payment.amount)}
                        </span>
                        <Badge
                          variant={payment.status === "completed" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">System Health</CardTitle>
                <CardDescription>
                  Live database probe and integration credential check
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {healthQuery.isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                )}
                {!healthQuery.isLoading &&
                  (healthQuery.data?.services ?? []).length === 0 && (
                    <p className="text-sm text-slate-400">No service data available.</p>
                  )}
                {(healthQuery.data?.services ?? []).map((service) => {
                  const ok =
                    service.status === "operational" || service.status === "configured";
                  return (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 bg-slate-600 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{service.name}</p>
                        <p className="text-xs text-slate-400">{service.uptime}</p>
                      </div>
                      <Badge variant={ok ? "default" : "secondary"}>{service.status}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-300">Revenue (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(Number(revenue?.totalRevenue ?? 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-300">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    {paymentsQuery.data?.total ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-300">Failed Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-400">
                    {Number(revenue?.failedPayments ?? 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">All Payments</CardTitle>
                <CardDescription>
                  Transaction ledger with gateway reference IDs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400">No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            User
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            Amount
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            Gateway
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            Transaction ID
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-semibold text-slate-300">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-slate-600 hover:bg-slate-600/50"
                          >
                            <td className="px-3 py-2 text-sm text-white">
                              {payment.userName ?? `User #${payment.userId}`}
                            </td>
                            <td className="px-3 py-2 text-sm text-white">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-300 capitalize">
                              {payment.gateway}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  payment.status === "completed" ? "default" : "secondary"
                                }
                                className="capitalize"
                              >
                                {payment.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-400 font-mono">
                              {payment.transactionId ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-400">
                              {formatDate(payment.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">Settings</CardTitle>
                <CardDescription>Platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-600 rounded-lg border border-slate-500">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-white mb-1">Payment Gateway Configuration</h4>
                        <p className="text-sm text-slate-400 mb-3">
                          Configure your eSewa and Khalti merchant accounts in environment variables
                        </p>
                        <div className="text-xs text-slate-500 space-y-1 font-mono">
                          <p>ESEWA_MERCHANT_CODE=your_merchant_code</p>
                          <p>KHALTI_PUBLIC_KEY=your_public_key</p>
                          <p>KHALTI_SECRET_KEY=your_secret_key</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-600 rounded-lg border border-slate-500">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-white mb-1">Advanced system control</h4>
                        <p className="text-sm text-slate-400">
                          Health monitoring, activity logs and alert management live in the{" "}
                          <a href="/system-admin" className="text-teal-400 hover:text-teal-300">
                            System Admin Panel
                          </a>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
