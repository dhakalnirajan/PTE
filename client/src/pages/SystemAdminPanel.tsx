import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Settings, AlertCircle, LogOut,
  TrendingUp, Server, Shield, FileText, BarChart3,
  RefreshCw, Eye, Edit, CheckCircle, Zap, Search,
} from "lucide-react";
import { motion } from "framer-motion";

export default function SystemAdminPanel() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("health");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch real data from backend
  const { data: systemStats, isLoading: statsLoading } = trpc.systemAdmin.getSystemStats.useQuery();
  const { data: systemHealth, isLoading: healthLoading } = trpc.systemAdmin.getSystemHealth.useQuery();
  const { data: activityLogs, isLoading: logsLoading } = trpc.systemAdmin.getActivityLogs.useQuery({
    limit: 50,
    offset: 0,
  });
  const { data: alerts, isLoading: alertsLoading } = trpc.systemAdmin.getSystemAlerts.useQuery();
  const { data: performanceMetrics, isLoading: metricsLoading } = trpc.systemAdmin.getPerformanceMetrics.useQuery();
  const { data: contentStats, isLoading: contentLoading } = trpc.systemAdmin.getContentStats.useQuery();
  const { data: systemConfig, isLoading: configLoading } = trpc.systemAdmin.getSystemConfig.useQuery();
  const {
    data: platformUsers,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = trpc.systemAdmin.getUsers.useQuery({
    limit: 20,
    offset: 0,
    search: searchQuery.trim() || undefined,
  });

  const utils = trpc.useUtils();
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [newConfigKey, setNewConfigKey] = useState("");

  const updateSystemConfig = trpc.systemAdmin.updateSystemConfig.useMutation({
    onSuccess: async (result) => {
      toast.success(`Saved ${result.key}`);
      setNewConfigKey("");
      setConfigDraft((prev) => {
        const next = { ...prev };
        delete next[result.key];
        return next;
      });
      await utils.systemAdmin.getSystemConfig.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveConfig = (key: string, fallback?: unknown) => {
    const draft = configDraft[key];
    const value = draft ?? String(fallback ?? "");
    updateSystemConfig.mutate({ key, value });
  };

  const acknowledgeAlert = trpc.systemAdmin.acknowledgeAlert.useMutation({
    onSuccess: async () => {
      toast.success("Alert acknowledged");
      await utils.systemAdmin.getSystemAlerts.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const reopenAlert = trpc.systemAdmin.reopenAlert.useMutation({
    onSuccess: async () => {
      toast.success("Alert reopened");
      await utils.systemAdmin.getSystemAlerts.invalidate();
    },
    onError: (error) => toast.error(error.message),
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

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-600 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  // Empty state
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">System Admin Panel</h1>
              <p className="text-xs text-slate-400">Senior Administrator Control</p>
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
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* System Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Users</p>
                    <p className="text-lg font-bold text-white">
                      {statsLoading ? "..." : systemStats?.totalUsers || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Active Subscriptions</p>
                    <p className="text-lg font-bold text-white">
                      {statsLoading ? "..." : systemStats?.activeSubscriptions || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
                    <p className="text-lg font-bold text-white">
                      ₨{statsLoading ? "..." : (systemStats?.totalRevenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            {/* Failed Payments */}
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Failed Payments</p>
                    <p className="text-lg font-bold text-white">
                      {statsLoading ? "..." : systemStats?.failedPayments || 0}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-700 border-slate-600 grid w-full grid-cols-6">
              <TabsTrigger value="health" className="text-white data-[state=active]:bg-red-600">
                <Server className="w-4 h-4 mr-2" />
                Health
              </TabsTrigger>
              <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="content" className="text-white data-[state=active]:bg-red-600">
                <FileText className="w-4 h-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-white data-[state=active]:bg-red-600">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-white data-[state=active]:bg-red-600">
                <BarChart3 className="w-4 h-4 mr-2" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-white data-[state=active]:bg-red-600">
                <AlertCircle className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
            </TabsList>

            {/* Health Tab */}
            <TabsContent value="health" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Service Status</CardTitle>
                  <CardDescription>
                    Live database probe and integration credential check
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthLoading ? (
                    <LoadingSkeleton />
                  ) : systemHealth?.services && systemHealth.services.length > 0 ? (
                    <div className="space-y-3">
                      {systemHealth.services.map((service, i) => {
                        const ok =
                          service.status === "operational" ||
                          service.status === "configured";
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-slate-600 rounded-lg"
                          >
                            <div>
                              <p className="text-white font-medium">{service.name}</p>
                              <p className="text-xs text-slate-400">{service.uptime}</p>
                            </div>
                            <Badge className={ok ? "bg-green-500" : "bg-amber-500"}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {service.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="No service data available" />
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Live Metrics</CardTitle>
                  <CardDescription>
                    Measured database latency and platform activity over the last 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <LoadingSkeleton />
                  ) : performanceMetrics ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        {
                          label: "Database latency",
                          value: `${performanceMetrics.databaseLatencyMs} ms`,
                        },
                        {
                          label: "Active users (24h)",
                          value: performanceMetrics.activeUsersLast24h,
                        },
                        {
                          label: "Sessions (24h)",
                          value: performanceMetrics.sessionsLast24h,
                        },
                        {
                          label: "Responses (24h)",
                          value: performanceMetrics.responsesLast24h,
                        },
                        {
                          label: "Payment failures (7d)",
                          value: `${performanceMetrics.paymentFailureRate7d}%`,
                        },
                        {
                          label: "Heap used",
                          value: `${performanceMetrics.memoryUsedMb} MB`,
                        },
                      ].map((metric) => (
                        <div key={metric.label} className="p-3 bg-slate-600 rounded-lg">
                          <p className="text-xs text-slate-400">{metric.label}</p>
                          <p className="text-lg font-semibold text-white">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No metrics available" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Platform Users</CardTitle>
                  <CardDescription>Manage and monitor user accounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search users by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-600 border-slate-500 text-white"
                      />
                    </div>
                    <Button
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={usersFetching}
                      onClick={() => refetchUsers()}
                    >
                      <RefreshCw className={`w-4 h-4 ${usersFetching ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  {usersLoading ? (
                    <LoadingSkeleton />
                  ) : platformUsers && platformUsers.users.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">
                        {platformUsers.total} user{platformUsers.total === 1 ? "" : "s"}
                        {searchQuery.trim() ? " matching your search" : " total"}
                      </p>
                      {platformUsers.users.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 p-3 bg-slate-600 rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {entry.name || "Unnamed user"}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {entry.email || "no email on file"} · joined{" "}
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={entry.isBanned ? "destructive" : "default"}>
                              {entry.isBanned ? "banned" : entry.role}
                            </Badge>
                            <a href="/admin/users">
                              <Button size="sm" variant="outline">
                                Manage
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      message={
                        searchQuery.trim()
                          ? "No users match your search"
                          : "No users found in the system"
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Content Management</CardTitle>
                  <CardDescription>Upload and manage PTE questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contentLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <>
                      <p className="text-sm text-slate-400 mb-4">
                        {contentStats?.total ?? 0} questions in the bank
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {["speaking", "writing", "reading", "listening"].map((section) => {
                          const row = contentStats?.sections.find(
                            (entry) => entry.section === section
                          );
                          return (
                            <div key={section} className="p-4 bg-slate-600 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-white font-medium capitalize">{section}</p>
                                  <p className="text-2xl font-bold text-teal-400">
                                    {row?.count ?? 0}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {row?.taskTypes ?? 0} task type
                                    {(row?.taskTypes ?? 0) === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <FileText className="w-8 h-8 text-teal-500" />
                              </div>
                              <a href={`/practice/${section}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View questions
                                </Button>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">System Configuration</CardTitle>
                  <CardDescription>Manage system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {configLoading ? (
                    <LoadingSkeleton />
                  ) : (
                    <div className="space-y-4">
                      {(systemConfig ?? []).length === 0 && (
                        <EmptyState message="No settings saved yet. Add one below." />
                      )}

                      {(systemConfig ?? []).map((entry) => (
                        <div key={entry.key} className="p-3 bg-slate-600 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-white font-medium">{entry.key}</p>
                              <p className="text-xs text-slate-400">
                                Updated {new Date(entry.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge className="bg-green-500">saved</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={
                                configDraft[entry.key] ??
                                (typeof entry.value === "string"
                                  ? entry.value
                                  : JSON.stringify(entry.value))
                              }
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  [entry.key]: e.target.value,
                                }))
                              }
                              className="bg-slate-700 border-slate-500 text-white"
                            />
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700"
                              disabled={updateSystemConfig.isPending}
                              onClick={() => handleSaveConfig(entry.key, entry.value)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="p-3 bg-slate-600/50 rounded-lg border border-dashed border-slate-500">
                        <p className="text-sm text-slate-300 mb-2 font-medium">Add a setting</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="key (e.g. feature.ai_coach)"
                            value={newConfigKey}
                            onChange={(e) => setNewConfigKey(e.target.value)}
                            className="bg-slate-700 border-slate-500 text-white"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!newConfigKey.trim() || updateSystemConfig.isPending}
                            onClick={() => {
                              const key = newConfigKey.trim();
                              updateSystemConfig.mutate({
                                key,
                                value: configDraft[key] ?? "enabled",
                              });
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Activity Logs</CardTitle>
                  <CardDescription>Track all system activities and events</CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <LoadingSkeleton />
                  ) : activityLogs && activityLogs.length > 0 ? (
                    <div className="space-y-2">
                      {activityLogs.map((log: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-600 rounded-lg border-l-4 border-teal-500">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-medium">{log.action}</p>
                              <p className="text-sm text-slate-400">
                                {log.userName} on {log.target}
                              </p>
                            </div>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-400">{log.details}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No activity logs available" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">System Alerts</CardTitle>
                  <CardDescription>Critical system notifications and warnings</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <LoadingSkeleton />
                  ) : alerts && alerts.length > 0 ? (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div
                          key={alert.alertKey}
                          className={`p-4 rounded-lg border-l-4 ${
                            alert.severity === "error"
                              ? "bg-red-900/20 border-red-500"
                              : alert.severity === "warning"
                              ? "bg-yellow-900/20 border-yellow-500"
                              : "bg-blue-900/20 border-blue-500"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-medium">{alert.title}</p>
                              <p className="text-sm text-slate-300">{alert.message}</p>
                            </div>
                            <Badge
                              variant={
                                alert.severity === "error"
                                  ? "destructive"
                                  : alert.severity === "warning"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3 mt-3">
                            <p className="text-xs text-slate-400">
                              {alert.source} · {new Date(alert.createdAt).toLocaleString()}
                            </p>
                            {alert.acknowledged ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-400">Acknowledged</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={reopenAlert.isPending}
                                  onClick={() => reopenAlert.mutate({ alertKey: alert.alertKey })}
                                >
                                  Reopen
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acknowledgeAlert.isPending}
                                onClick={() => acknowledgeAlert.mutate({ alertKey: alert.alertKey })}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No active alerts" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
