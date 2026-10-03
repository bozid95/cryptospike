import React, { useState } from "react";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { useCryptoSpike } from "@/context/trading-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function LoginView() {
  const { login } = useCryptoSpike();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await login(username.trim(), password.trim());
      if (!res.success) {
        setErrorMessage(res.message || "Invalid username or password.");
      } else {
        window.history.pushState(null, "", "/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "An error occurred during authentication.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm border-border shadow-sm bg-card text-card-foreground">
        <CardHeader className="space-y-2 text-center pb-5">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-xs mb-1">
            ⚡
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CardTitle className="text-xl font-bold tracking-tight">
              CryptoSpike
            </CardTitle>
            <Badge
              variant="outline"
              className="font-mono text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/5 font-semibold"
            >
              PRO
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in to access Trading Control Panel
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-1">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="h-9 text-sm"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-9 text-sm"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 font-medium cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
