import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard, Download, Calendar, DollarSign, CheckCircle, Clock, XCircle,
  RefreshCw, ArrowRight, Loader2, AlertTriangle, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount: number, currency = "NPR") {
  return `${currency === "NPR" ? "₨" : currency + " "}${amount.toLocaleString()}`;
}

function planFeatures(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.filter((f): f is string => typeof f === "string");
  }
  return [];
}

type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

function statusIcon(status: PaymentStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <CreditCard className="w-5 h-5 text-slate-400" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500">Pending</Badge>;
    case "failed":
      return <Badge className="bg-red-500">Failed</Badge>;
    case "refunded":
      return <Badge variant="outline">Refunded</Badge>;
    case "active":
      return <Badge className="bg-teal-500">Active</Badge>;
    case "canceled":
      return <Badge variant="secondary">Canceled</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/**
 * Build a downloadable receipt from a payment record. Kept client-side so a
 * receipt is always available, even for payments recorded before this page.
 */
function downloadReceipt(payment: {
  id: number;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  description: string | null;
  transactionId: string | null;
  referenceId: string | null;
  createdAt: Date | string;
}) {
  const lines = [
    "PTEMaster — Payment Receipt",
    "================================",
    `Receipt ID     : #${payment.id}`,
    `Date           : ${formatDate(payment.createdAt)}`,
    `Description    : ${payment.description ?? "—"}`,
    `Amount         : ${formatAmount(payment.amount, payment.currency)}`,
    `Gateway        : ${payment.gateway}`,
    `Status         : ${payment.status}`,
    `Transaction ID : ${payment.transactionId ?? "—"}`,
    `Reference ID   : ${payment.referenceId ?? "—"}`,
    "",
    "Thank you for practicing with PTEMaster.",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ptemaster-receipt-${payment.id}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"subscription" | "payments">("subscription");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  const utils = trpc.useUtils();

  const subscriptionQuery = trpc.payment.getActiveSubscription.useQuery(undefined, {
    enabled: !!user,
  });
  const paymentsQuery = trpc.payment.getPaymentHistory.useQuery(undefined, {
    enabled: !!user,
  });
  const plansQuery = trpc.payment.getPlans.useQuery(undefined, {
    enabled: !!user,
  });
  const historyQuery = trpc.payment.getSubscriptionHistory.useQuery(undefined, {
    enabled: !!user,
  });

  const refreshBilling = async () => {
    await Promise.all([
      utils.payment.getActiveSubscription.invalidate(),
      utils.payment.getSubscriptionHistory.invalidate(),
      utils.payment.getPaymentHistory.invalidate(),
    ]);
  };

  const setAutoRenew = trpc.payment.setAutoRenew.useMutation({
    onSuccess: (result) => {
      toast.success(`Auto-renewal ${result.autoRenew ? "enabled" : "disabled"}`);
      refreshBilling();
    },
    onError: (error) => toast.error(error.message),
  });

  const changePlan = trpc.payment.changePlan.useMutation({
    onSuccess: () => {
      toast.success("Your plan has been updated");
      setPlanPickerOpen(false);
      refreshBilling();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelSubscription = trpc.payment.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Your subscription has been canceled");
      setConfirmCancel(false);
      refreshBilling();
    },
    onError: (error) => toast.error(error.message),
  });

  const reactivateSubscription = trpc.payment.reactivateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Your subscription is active again");
      refreshBilling();
    },
    onError: (error) => toast.error(error.message),
  });

  const subscription = subscriptionQuery.data;
  const payments = paymentsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const pastSubscriptions = (historyQuery.data ?? []).filter(
    (item) => item.status !== "active"
  );

  const isLoading = subscriptionQuery.isLoading || paymentsQuery.isLoading;

  const isMutating =
    setAutoRenew.isPending ||
    changePlan.isPending ||
    cancelSubscription.isPending ||
    reactivateSubscription.isPending;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Please log in to manage your subscription</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
              <p className="text-slate-600">Manage your plan, renewal and payment history</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "subscription"
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Current Subscription
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "payments"
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Payment History
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {!isLoading && subscriptionQuery.isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">
                We couldn't load your subscription. Please refresh and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Current Subscription */}
        {!isLoading && !subscriptionQuery.isError && activeTab === "subscription" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {subscription ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {subscription.plan?.name ?? "Your"} Plan
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {statusBadge(subscription.status)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-teal-600">
                          {formatAmount(subscription.plan?.price ?? 0)}
                        </p>
                        <p className="text-sm text-slate-600">
                          per {subscription.plan?.interval === "yearly" ? "year" : "month"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Started</p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(subscription.startDate)}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Next Renewal</p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(subscription.renewalDate)}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 mb-1">Auto-Renew</p>
                            <p className="font-semibold text-slate-900">
                              {subscription.autoRenew ? "Enabled" : "Disabled"}
                            </p>
                          </div>
                          <Switch
                            checked={!!subscription.autoRenew}
                            disabled={isMutating}
                            onCheckedChange={(checked) =>
                              setAutoRenew.mutate({
                                subscriptionId: subscription.id,
                                autoRenew: checked,
                              })
                            }
                            aria-label="Toggle auto-renewal"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    {planFeatures(subscription.plan?.features).length > 0 && (
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-3">Included Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {planFeatures(subscription.plan?.features).map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-teal-600" />
                              <span className="text-slate-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={isMutating}
                        onClick={() => setPlanPickerOpen((open) => !open)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Change Plan
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        disabled={isMutating}
                        onClick={() => setConfirmCancel(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </div>

                    {/* Cancel confirmation */}
                    {confirmCancel && (
                      <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-red-800">
                              Cancel your subscription?
                            </p>
                            <p className="text-sm text-red-700 mb-3">
                              You'll keep access until the end of the current period. You can
                              reactivate at any time.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                disabled={cancelSubscription.isPending}
                                onClick={() =>
                                  cancelSubscription.mutate({ subscriptionId: subscription.id })
                                }
                              >
                                {cancelSubscription.isPending && (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Yes, cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmCancel(false)}
                              >
                                Keep subscription
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plan picker */}
                    {planPickerOpen && (
                      <div className="space-y-3">
                        <p className="font-medium text-slate-900">Choose a new plan</p>
                        {plansQuery.isLoading && (
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading plans...
                          </div>
                        )}
                        {!plansQuery.isLoading && plans.length === 0 && (
                          <p className="text-sm text-slate-500">
                            No plans are available right now.
                          </p>
                        )}
                        {plans.map((plan) => {
                          const isCurrent = plan.id === subscription.planId;
                          return (
                            <div
                              key={plan.id}
                              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900">{plan.name}</p>
                                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                                </div>
                                <p className="text-sm text-slate-600">
                                  {formatAmount(plan.price)} /{" "}
                                  {plan.interval === "yearly" ? "year" : "month"}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={isCurrent ? "outline" : "default"}
                                className={isCurrent ? "" : "bg-teal-600 hover:bg-teal-700"}
                                disabled={isCurrent || isMutating}
                                onClick={() =>
                                  changePlan.mutate({
                                    subscriptionId: subscription.id,
                                    planId: plan.id,
                                  })
                                }
                              >
                                {isCurrent ? "Selected" : "Switch to this plan"}
                              </Button>
                            </div>
                          );
                        })}
                        <p className="text-xs text-slate-500">
                          Switching starts a new billing period from today.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Past subscriptions */}
                {pastSubscriptions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Previous Subscriptions</CardTitle>
                      <CardDescription>Plans you've used in the past</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pastSubscriptions.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.plan?.name ?? "Plan"} Plan
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatDate(item.startDate)} — {formatDate(item.endDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {statusBadge(item.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isMutating}
                              onClick={() =>
                                reactivateSubscription.mutate({ subscriptionId: item.id })
                              }
                            >
                              Reactivate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-10 h-10 text-teal-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    You're on the Free plan
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Upgrade to unlock AI feedback, coaching plans and advanced analytics.
                  </p>
                  {plans.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 text-left">
                      {plans.map((plan) => (
                        <div key={plan.id} className="p-4 bg-white rounded-lg border border-teal-100">
                          <p className="font-semibold text-slate-900">{plan.name}</p>
                          <p className="text-teal-600 font-bold">
                            {formatAmount(plan.price)}
                            <span className="text-xs text-slate-500 font-normal">
                              {" "}
                              / {plan.interval === "yearly" ? "year" : "month"}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/pricing">
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      View Plans
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Payment History */}
        {!isLoading && !subscriptionQuery.isError && activeTab === "payments" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All your transactions and receipts</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsQuery.isError ? (
                  <div className="text-center py-8 text-red-600">
                    Couldn't load your payments. Please try again.
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment, i) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {statusIcon(payment.status)}
                          <div>
                            <p className="font-medium text-slate-900">
                              {payment.description ?? "Subscription payment"}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(payment.createdAt)}
                              <span className="capitalize">• {payment.gateway}</span>
                            </p>
                            {payment.transactionId && (
                              <p className="text-xs text-slate-500 font-mono">
                                {payment.transactionId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900 flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatAmount(payment.amount, payment.currency)}
                            </p>
                            {statusBadge(payment.status)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => downloadReceipt(payment)}
                          >
                            <Download className="w-4 h-4" />
                            Receipt
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
