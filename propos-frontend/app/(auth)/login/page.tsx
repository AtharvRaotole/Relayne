"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      setError("root", { message: "API URL not configured" });
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message ?? "Login failed";
        setError("root", { message: msg });
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
        setError("root", { message: "Invalid response from server" });
      }
    } catch (err) {
      setError("root", { message: "Network error. Is the backend running?" });
    }
  };

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
        <h1
          className="text-xl font-semibold text-gray-950"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Log in
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your credentials to access your account
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {errors.root.message}
            </p>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="mt-1"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="mt-1"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-gray-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
