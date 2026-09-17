import { AdminLayout } from "@/components/AdminLayout";
import AdminAnalytics from "@/components/AdminAnalytics";

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            Engagement, learning performance, revenue, retention and customer lifetime value.
          </p>
        </div>
        <AdminAnalytics />
      </div>
    </AdminLayout>
  );
}
