"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PrismWordmark } from "@prism/ui/components/prism-mark";
import { Alert, AlertDescription } from "@prism/ui/ui/alert";
import { Button } from "@prism/ui/ui/button";
import { Input } from "@prism/ui/ui/input";
import { Label } from "@prism/ui/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@prism/ui/ui/tabs";
import { FacetField } from "@/components/facet-field";
import { actions, api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { signIn, useSession } from "@/lib/session";
import type { Customer } from "@prism/ui/lib/types";

const signInSchema = z.object({ customerId: z.string().regex(/^\d{9}$/, "Enter the 9-digit customer ID") });
const registerSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name"),
  last_name: z.string().trim().min(1, "Enter your last name"),
  email: z.string().trim().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address"),
  phone: z.string().trim().regex(/^(\d{7,15})?$/, "Use digits only, 7 to 15 of them").optional(),
});

export default function HomePage() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:gap-16 lg:p-12">
        <PrismWordmark inverted />
        <FacetField className="absolute inset-x-0 bottom-0 h-[58%] w-full" />
        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-[40px] leading-[1.08] font-semibold text-white">Every change, in seconds.</h2>
          <p className="text-base text-sky/85">
            Deposit, transfer or freeze an account and watch it appear in your balance straight away.
          </p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <PrismWordmark className="lg:hidden" />
          <div className="space-y-1.5">
            <h1 className="text-[28px] leading-tight font-semibold text-ink">Welcome to Prism360</h1>
            <p className="text-sm text-slate">Sign in with your customer ID, or register to get one.</p>
          </div>
          <Tabs defaultValue="signin" className="gap-6">
            <TabsList className="w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <SignInForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterFlow />
            </TabsContent>
          </Tabs>
          <p className="flex items-start gap-2 text-xs text-slate">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cobalt" />
            Demo app: your customer ID is remembered in this browser. There is no password.
          </p>
        </div>
      </section>
    </main>
  );
}

function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { customerId: "" } });

  async function onSubmit({ customerId }: z.infer<typeof signInSchema>) {
    setError(null);
    try {
      await api.get<Customer>(`/customers/${customerId}`);
      signIn(customerId);
      router.push("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="customerId">Customer ID</Label>
        <Input
          id="customerId"
          inputMode="numeric"
          autoComplete="username"
          placeholder="9 digits"
          maxLength={9}
          className="font-mono tnum"
          aria-invalid={!!form.formState.errors.customerId}
          {...form.register("customerId")}
        />
        {form.formState.errors.customerId && (
          <p className="text-sm text-destructive">{form.formState.errors.customerId.message}</p>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        <ArrowRight />
      </Button>
    </form>
  );
}

function RegisterFlow() {
  const router = useRouter();
  const [created, setCreated] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "" },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setError(null);
    try {
      setCreated(await actions.register({ ...values, phone: values.phone || undefined }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function approveAndContinue() {
    if (!created) return;
    setApproving(true);
    try {
      await actions.approveKyc(created.customer_id);
      signIn(created.customer_id);
      toast.success("KYC approved");
      router.push("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setApproving(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-5">
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-ok">
            <Check className="size-4" /> Customer created
          </p>
          <div>
            <p className="text-sm text-slate">Your customer ID</p>
            <p className="font-mono text-[28px] font-medium tracking-wide text-ink tnum">{created.customer_id}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(created.customer_id); toast.success("Customer ID copied"); }}>
            Copy ID
          </Button>
          <p className="text-sm text-slate">Keep this ID. You&apos;ll use it to sign in.</p>
        </div>
        <p className="text-sm text-slate">
          Accounts open once your KYC is approved. In this demo you can approve it yourself.
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button className="w-full" size="lg" onClick={approveAndContinue} disabled={approving}>
          {approving ? "Approving…" : "Approve KYC and continue"}
          <ArrowRight />
        </Button>
      </div>
    );
  }

  const err = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field id="first_name" label="First name" error={err.first_name?.message}>
          <Input id="first_name" autoComplete="given-name" aria-invalid={!!err.first_name} {...form.register("first_name")} />
        </Field>
        <Field id="last_name" label="Last name" error={err.last_name?.message}>
          <Input id="last_name" autoComplete="family-name" aria-invalid={!!err.last_name} {...form.register("last_name")} />
        </Field>
      </div>
      <Field id="email" label="Email" error={err.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!err.email} {...form.register("email")} />
      </Field>
      <Field id="phone" label="Phone (optional)" error={err.phone?.message}>
        <Input id="phone" inputMode="tel" autoComplete="tel" aria-invalid={!!err.phone} {...form.register("phone")} />
      </Field>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating…" : "Create customer"}
      </Button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
