import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 50;

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = trpc.systemAdmin.getRecentPayments.useQuery({
    limit: PAGE_SIZE,
    offset,
  });
  const { data: revenue } = trpc.systemAdmin.getPaymentRevenue.useQuery({ days: 30 });

  const payments = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const filteredPayments = payments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      (payment.userName ?? "").toLowerCase().includes(term) ||
      (payment.userEmail ?? "").toLowerCase().includes(term) ||
      (payment.transactionId ?? "").toLowerCase().includes(term) ||
      String(payment.amount).includes(term)
    );
  });

  const completedCount = payments.filter((p) => p.status === "completed").length;
  const failedCount = payments.filter((p) => p.status === "failed").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={18} className="text-green-600" />;
      case "failed":
        return <XCircle size={18} className="text-red-600" />;
      case "pending":
        return <Clock size={18} className="text-yellow-600" />;
      default:
        return <CreditCard size={18} className="text-gray-600" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all payment transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-3xl font-bold mt-2">{total}</p>
                </div>
                <CreditCard className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Successful (this page)</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">{completedCount}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">
                    {revenue?.failedPayments ?? failedCount}
                  </p>
                </div>
                <XCircle className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue (30 days)</p>
                  <p className="text-3xl font-bold mt-2">
                    ₨{Number(revenue?.totalRevenue ?? 0).toLocaleString()}
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-teal-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, transaction ID or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Newest first — search filters the {payments.length} loaded transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-red-600">Couldn't load payments. Please try again.</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gateway</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">
                            {payment.userName || `User #${payment.userId}`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">{payment.userEmail || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            ₨{payment.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize">
                            {payment.gateway}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {payment.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-600 font-mono">
                            {payment.transactionId || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(hasMore || offset > 0) && (
              <div className="flex items-center justify-between pt-6">
                <p className="text-sm text-gray-600">
                  Showing {offset + 1}–{offset + payments.length} of {total} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
