import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Mail, Calendar, Crown, UserMinus, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);

  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc.systemAdmin.getUsers.useQuery({
    limit: PAGE_SIZE,
    offset,
    search: searchTerm.trim() || undefined,
  });

  const setUserRole = trpc.systemAdmin.setUserRole.useMutation({
    onSuccess: (result) => {
      toast.success(result.role === "admin" ? "User promoted to admin" : "Admin access removed");
      utils.systemAdmin.getUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const setUserBan = trpc.systemAdmin.setUserBan.useMutation({
    onSuccess: (result) => {
      toast.success(result.isBanned ? "User banned" : "User unbanned");
      utils.systemAdmin.getUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const isMutating = setUserRole.isPending || setUserBan.isPending;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage and monitor all user accounts</p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOffset(0);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Total: {total} users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-red-600">Couldn't load users. Please try again.</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                              {(user.name ?? "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">
                              {user.name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={16} />
                            {user.email ?? "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              user.isBanned
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.isBanned ? "banned" : "active"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Calendar size={16} />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {user.role === "user" ? (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  setUserRole.mutate({ userId: user.id, role: "admin" })
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                title="Promote to admin"
                              >
                                <Crown size={18} className="text-amber-600" />
                              </button>
                            ) : (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  setUserRole.mutate({ userId: user.id, role: "user" })
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                title="Remove admin access"
                              >
                                <UserMinus size={18} className="text-orange-600" />
                              </button>
                            )}

                            {user.isBanned ? (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  setUserBan.mutate({ userId: user.id, banned: false })
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                title="Unban user"
                              >
                                <CheckCircle size={18} className="text-green-600" />
                              </button>
                            ) : (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  setUserBan.mutate({ userId: user.id, banned: true })
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                title="Ban user"
                              >
                                <Ban size={18} className="text-red-600" />
                              </button>
                            )}
                          </div>
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
                  Showing {offset + 1}–{offset + users.length} of {total} users
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
