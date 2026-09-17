import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Ban, Crown, Eye, Download, ArrowUpDown, Loader2, AlertTriangle,
  CheckCircle, UserMinus,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type RoleFilter = "all" | "user" | "admin";
type StatusFilter = "all" | "active" | "banned";
type SortKey = "name" | "created" | "lastSignedIn";

const PAGE_SIZE = 50;

export default function AdminUserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<RoleFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("created");
  const [offset, setOffset] = useState(0);

  const utils = trpc.useUtils();

  const usersQuery = trpc.systemAdmin.getUsers.useQuery({
    limit: PAGE_SIZE,
    offset,
    search: searchTerm.trim() || undefined,
  });

  const refresh = () => utils.systemAdmin.getUsers.invalidate();

  const setUserRole = trpc.systemAdmin.setUserRole.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.role === "admin"
          ? "User promoted to admin"
          : "Admin access removed"
      );
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const setUserBan = trpc.systemAdmin.setUserBan.useMutation({
    onSuccess: (result) => {
      toast.success(result.isBanned ? "User banned" : "User unbanned");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const isMutating = setUserRole.isPending || setUserBan.isPending;

  const rows = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const hasMore = usersQuery.data?.hasMore ?? false;

  // Role/status/sort are applied to the loaded page; search is server-side.
  const displayUsers = useMemo(() => {
    return rows
      .filter((user) => filterRole === "all" || user.role === filterRole)
      .filter((user) => {
        if (filterStatus === "all") return true;
        if (filterStatus === "banned") return user.isBanned;
        return !user.isBanned;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return (a.name ?? "").localeCompare(b.name ?? "");
          case "lastSignedIn":
            return (
              new Date(b.lastSignedIn).getTime() -
              new Date(a.lastSignedIn).getTime()
            );
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });
  }, [rows, filterRole, filterStatus, sortBy]);

  const exportCsv = () => {
    const header = [
      "id",
      "name",
      "email",
      "role",
      "status",
      "createdAt",
      "lastSignedIn",
    ];
    const lines = displayUsers.map((user) =>
      [
        user.id,
        user.name ?? "",
        user.email ?? "",
        user.role,
        user.isBanned ? "banned" : "active",
        new Date(user.createdAt).toISOString(),
        new Date(user.lastSignedIn).toISOString(),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    const blob = new Blob([ [header.join(","), ...lines].join("\n") ], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ptemaster-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const formatDate = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">User Management</h3>
          <p className="text-sm text-slate-400">
            {usersQuery.isLoading
              ? "Loading users..."
              : `${total} user${total !== 1 ? "s" : ""} on the platform`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={displayUsers.length === 0}
            onClick={exportCsv}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setOffset(0);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as RoleFilter)}
          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          className="px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Users Table */}
      <Card className="bg-slate-700 border-slate-600 overflow-hidden">
        {usersQuery.isError && (
          <CardContent className="p-6 flex items-center gap-3 text-red-300">
            <AlertTriangle className="w-5 h-5" />
            Couldn't load users. Please try again.
          </CardContent>
        )}

        {usersQuery.isLoading && (
          <CardContent className="p-8 flex items-center justify-center gap-3 text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading users...
          </CardContent>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    <button
                      onClick={() => setSortBy("name")}
                      className="flex items-center gap-2 hover:text-white"
                    >
                      Name <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    <button
                      onClick={() => setSortBy("lastSignedIn")}
                      className="flex items-center gap-2 hover:text-white"
                    >
                      Last Seen <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-600 hover:bg-slate-600/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{user.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {user.email ? (
                        <a
                          href={`mailto:${user.email}`}
                          className="text-teal-400 hover:text-teal-300 text-sm"
                        >
                          {user.email}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.isBanned ? (
                        <Badge className="bg-red-100 text-red-800">banned</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {formatDate(user.lastSignedIn)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {user.role === "user" ? (
                          <button
                            disabled={isMutating}
                            onClick={() =>
                              setUserRole.mutate({ userId: user.id, role: "admin" })
                            }
                            className="p-2 hover:bg-slate-500 rounded transition-colors disabled:opacity-40"
                            title="Promote to admin"
                          >
                            <Crown className="w-4 h-4 text-amber-300" />
                          </button>
                        ) : (
                          <button
                            disabled={isMutating}
                            onClick={() =>
                              setUserRole.mutate({ userId: user.id, role: "user" })
                            }
                            className="p-2 hover:bg-slate-500 rounded transition-colors disabled:opacity-40"
                            title="Remove admin access"
                          >
                            <UserMinus className="w-4 h-4 text-slate-300" />
                          </button>
                        )}

                        {user.isBanned ? (
                          <button
                            disabled={isMutating}
                            onClick={() =>
                              setUserBan.mutate({ userId: user.id, banned: false })
                            }
                            className="p-2 hover:bg-slate-500 rounded transition-colors disabled:opacity-40"
                            title="Unban user"
                          >
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </button>
                        ) : (
                          <button
                            disabled={isMutating}
                            onClick={() =>
                              setUserBan.mutate({ userId: user.id, banned: true })
                            }
                            className="p-2 hover:bg-slate-500 rounded transition-colors disabled:opacity-40"
                            title="Ban user"
                          >
                            <Ban className="w-4 h-4 text-red-400" />
                          </button>
                        )}

                        <a
                          href={`mailto:${user.email ?? ""}`}
                          className="p-2 hover:bg-slate-500 rounded transition-colors"
                          title="Email user"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && displayUsers.length === 0 && (
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No users found matching your filters</p>
          </CardContent>
        )}
      </Card>

      {/* Pagination */}
      {(hasMore || offset > 0) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {offset + 1}–{offset + rows.length} of {total} users
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
    </div>
  );
}
