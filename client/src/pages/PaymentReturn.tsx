import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type Flow = "esewa-success" | "esewa-failure" | "khalti-callback";
type State = "idle" | "verifying" | "success" | "failed";

export default function PaymentReturn({ flow }: { flow: Flow }) {
  const { user, loading: authLoading } = useAuth();
  const started = useRef(false);

  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const utils = trpc.useUtils();

  const refreshPaymentData = async () => {
    await Promise.all([
      utils.payment.getActiveSubscription.invalidate(),
      utils.payment.getSubscriptionHistory.invalidate(),
      utils.payment.getPaymentHistory.invalidate(),
    ]);
  };

  const verifyESewa = trpc.payment.verifyESewaPayment.useMutation({
    onSuccess: async (result) => {
      await refreshPaymentData();
      setState("success");
      setMessage(
        result.fulfilment
          ? `Your ${result.fulfilment.planName} subscription is active.`
          : "Payment confirmed. Your subscription is being updated."
      );
    },
    onError: (error) => {
      setState("failed");
      setMessage(error.message || "We could not verify the payment with eSewa.");
    },
  });

  const verifyKhalti = trpc.payment.verifyKhaltiPayment.useMutation({
    onSuccess: async (result) => {
      await refreshPaymentData();
      setState("success");
      setMessage(
        result.fulfilment
          ? `Your ${result.fulfilment.planName} subscription is active.`
          : "Payment confirmed. Your subscription is being updated."
      );
    },
    onError: (error) => {
      setState("failed");
      setMessage(error.message || "We could not verify the payment with Khalti.");
    },
  });

  useEffect(() => {
    if (authLoading || started.current) return;

    if (!user) {
      setState("failed");
      setMessage("Please sign in to confirm your payment.");
      return;
    }

    if (flow === "esewa-failure") {
      started.current = true;
      setState("failed");
      setMessage("The payment was cancelled or declined at eSewa. You have not been charged.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    started.current = true;

    if (flow === "esewa-success") {
      const transactionCode = params.get("q") ?? "";
      const referenceId = params.get("pid") ?? params.get("oid") ?? undefined;

      if (!transactionCode) {
        setState("failed");
        setMessage(
          "eSewa did not return a payment payload. If money was deducted, contact support with your transaction reference."
        );
        return;
      }

      setState("verifying");
      verifyESewa.mutate({ transactionCode, referenceId });
      return;
    }

    // Khalti return
    const status = (params.get("status") ?? params.get("txnStatus") ?? "").toLowerCase();
    const pidx = params.get("pidx") ?? "";
    const amount = Number(params.get("amount") ?? 0);
    const transactionId = params.get("transaction_id") ?? params.get("txnId") ?? undefined;

    if (status && status !== "completed") {
      setState("failed");
      setMessage("The payment was not completed at Khalti. You have not been charged.");
      return;
    }

    if (!pidx) {
      setState("failed");
      setMessage(
        "Khalti did not return a payment reference. If money was deducted, contact support with your transaction reference."
      );
      return;
    }

    setState("verifying");
    verifyKhalti.mutate({ pidx, amount, transactionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, flow]);

  const icon =
    state === "success" ? (
      <CheckCircle className="w-14 h-14 text-teal-600 mx-auto" />
    ) : state === "failed" ? (
      <XCircle className="w-14 h-14 text-red-500 mx-auto" />
    ) : (
      <Loader2 className="w-14 h-14 text-teal-600 mx-auto animate-spin" />
    );

  const title =
    state === "success"
      ? "Payment confirmed"
      : state === "failed"
        ? "Payment not completed"
        : "Confirming your payment";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="text-center">
              {icon}
              <CardTitle className="mt-4">{title}</CardTitle>
              <CardDescription>
                {state === "verifying"
                  ? "Please wait while we confirm the transaction with the gateway."
                  : message}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/payments">
                <Button className="w-full sm:w-auto">Go to my subscription</Button>
              </Link>
              {state === "failed" && (
                <Link href="/pricing">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Back to plans
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
