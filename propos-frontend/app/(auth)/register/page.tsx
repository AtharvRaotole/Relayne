"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugFromOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "my-organization";
}

const step1Schema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
});

const step2Schema = z.object({
  plan: z.enum(["starter", "growth", "enterprise"]),
});

const step3Schema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

const PLANS = [
  { id: "starter" as const, name: "Starter", price: "$2/unit/mo", desc: "Up to 1,000 units" },
  { id: "growth" as const, name: "Growth", price: "$2.80/unit/mo", desc: "Up to 5,000 units" },
  { id: "enterprise" as const, name: "Enterprise", price: "Custom", desc: "Unlimited" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { orgName: "" },
  });
  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { plan: "growth" },
  });
  const step3Form = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onStep1 = step1Form.handleSubmit((data) => {
    setOrgName(data.orgName);
    setStep(2);
  });
  const onStep2 = step2Form.handleSubmit(() => setStep(3));
  const onStep3 = step3Form.handleSubmit(async (data) => {
    setSubmitError(null);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      setSubmitError("API not configured. Check .env.local.");
      return;
    }
    const organizationSlug = slugFromOrgName(orgName);
    try {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          organizationSlug,
          email: data.email.trim(),
          password: data.password,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json?.error?.code;
        const msg =
          code === "CONFLICT"
            ? json?.error?.message ?? "This organization or email is already in use."
            : json?.error?.message ?? "Something went wrong. Please try again.";
        setSubmitError(msg);
        return;
      }
      if (json.success && json.data?.accessToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", json.data.accessToken);
          if (json.data.refreshToken) {
            localStorage.setItem("refreshToken", json.data.refreshToken);
          }
        }
        router.push("/overview");
        router.refresh();
      } else {
        setSubmitError("Invalid response. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Is the backend running?");
    }
  });

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950">
            <div className="grid grid-cols-2 gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-[2px] ${
                    i === 3 ? "bg-gray-400" : "bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
          <span
            className="text-lg font-bold tracking-tight text-gray-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Relayne
          </span>
        </Link>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                step >= s ? "bg-gray-700" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <h1
          className="text-xl font-semibold text-gray-950"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {step === 1 && "Create your organization"}
          {step === 2 && "Choose your plan"}
          {step === 3 && "Create your account"}
        </h1>

        {step === 1 && (
          <form onSubmit={onStep1} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                placeholder="Acme Property Management"
                className="mt-1"
                {...step1Form.register("orgName")}
              />
              {step1Form.formState.errors.orgName && (
                <p className="mt-1 text-xs text-red-500">
                  {step1Form.formState.errors.orgName.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onStep2} className="mt-6 space-y-3">
            {PLANS.map((plan) => (
              <label
                key={plan.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                  step2Form.watch("plan") === plan.id
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {plan.price}
                </span>
                <input
                  type="radio"
                  className="sr-only"
                  {...step2Form.register("plan")}
                  value={plan.id}
                />
              </label>
            ))}
            <Button type="submit" className="mt-4 w-full">
              Continue
            </Button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={onStep3} className="mt-6 space-y-4">
            {submitError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {submitError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  className="mt-1"
                  {...step3Form.register("firstName")}
                />
                {step3Form.formState.errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">
                    {step3Form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  className="mt-1"
                  {...step3Form.register("lastName")}
                />
                {step3Form.formState.errors.lastName && (
                  <p className="mt-1 text-xs text-red-500">
                    {step3Form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="mt-1"
                {...step3Form.register("email")}
              />
              {step3Form.formState.errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {step3Form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="mt-1"
                {...step3Form.register("password")}
              />
              {step3Form.formState.errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {step3Form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={step3Form.formState.isSubmitting}
            >
              {step3Form.formState.isSubmitting ? "Creating account..." : "Start Free Trial"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-gray-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
