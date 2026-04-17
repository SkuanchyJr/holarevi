import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type VerifyState = null | "success" | "already" | "expired" | "invalid" | "error";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const { loginMutation, registerMutation, resendVerificationMutation, isAuthenticated } = useAuth();
    const [, setLocation] = useLocation();
    const { language, t } = useLanguage();
    const { toast } = useToast();

    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const verifyState = (params.get("verified") as VerifyState) || null;
    const queryEmail = params.get("email") || "";

    const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(
        verifyState === "expired" ? queryEmail : null,
    );

    const [formData, setFormData] = useState({
        email: queryEmail || "",
        password: "",
        firstName: "",
        lastName: "",
    });

    useEffect(() => {
        if (isAuthenticated) {
            setLocation(`/${language}/`);
        }
    }, [isAuthenticated, language, setLocation]);

    if (isAuthenticated) return null;

    const isPending = loginMutation.isPending || registerMutation.isPending;

    const showResend = (email: string) => {
        if (!email) return;
        setPendingVerifyEmail(email);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            if (!formData.email || !formData.password) {
                toast({ title: t("common.error"), description: t("auth.error.fillFields"), variant: "destructive" });
                return;
            }
            loginMutation.mutate(
                { email: formData.email, password: formData.password },
                {
                    onError: (err: any) => {
                        const message = err?.message || "";
                        if (message.toLowerCase().includes("verify") || message.toLowerCase().includes("verifica")) {
                            showResend(formData.email);
                            toast({
                                title: t("auth.verify.required"),
                                description: t("auth.verify.requiredDesc"),
                                variant: "destructive",
                            });
                        } else {
                            toast({ title: t("auth.error.loginFailed"), description: message, variant: "destructive" });
                        }
                    },
                },
            );
        } else {
            if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
                toast({ title: t("common.error"), description: t("auth.error.fillFields"), variant: "destructive" });
                return;
            }
            if (formData.password.length < 8) {
                toast({ title: t("common.error"), description: t("auth.error.passwordLength"), variant: "destructive" });
                return;
            }
            registerMutation.mutate(
                {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    language,
                },
                {
                    onSuccess: (data) => {
                        if (data?.requiresVerification) {
                            setPendingVerifyEmail(formData.email);
                            setIsLogin(true);
                            toast({
                                title: t("auth.verify.sent"),
                                description: t("auth.verify.sentDesc").replace("{email}", formData.email),
                            });
                        }
                    },
                    onError: (err: any) => {
                        toast({ title: t("auth.error.registerFailed"), description: err.message, variant: "destructive" });
                    },
                },
            );
        }
    };

    const handleResend = () => {
        const email = pendingVerifyEmail || formData.email;
        if (!email) {
            toast({ title: t("common.error"), description: t("auth.verify.needEmail"), variant: "destructive" });
            return;
        }
        resendVerificationMutation.mutate(
            { email, language },
            {
                onSuccess: () => {
                    toast({ title: t("auth.verify.resent"), description: t("auth.verify.resentDesc") });
                },
                onError: (err: any) => {
                    toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                },
            },
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const verifyBanner = (() => {
        if (!verifyState) return null;
        const map: Record<NonNullable<VerifyState>, { titleKey: string; descKey: string; tone: "success" | "warn" | "error" }> = {
            success: { titleKey: "auth.verify.successTitle", descKey: "auth.verify.successDesc", tone: "success" },
            already: { titleKey: "auth.verify.alreadyTitle", descKey: "auth.verify.alreadyDesc", tone: "success" },
            expired: { titleKey: "auth.verify.expiredTitle", descKey: "auth.verify.expiredDesc", tone: "warn" },
            invalid: { titleKey: "auth.verify.invalidTitle", descKey: "auth.verify.invalidDesc", tone: "error" },
            error: { titleKey: "auth.verify.errorTitle", descKey: "auth.verify.errorDesc", tone: "error" },
        };
        const cfg = map[verifyState];
        const tone =
            cfg.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : cfg.tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
        return (
            <div className={`mb-4 rounded-md border px-3 py-2.5 text-sm flex items-start gap-2 ${tone}`} data-testid="banner-verify-state">
                {cfg.tone === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                    <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div>
                    <p className="font-medium">{t(cfg.titleKey)}</p>
                    <p className="text-xs opacity-90">{t(cfg.descKey)}</p>
                </div>
            </div>
        );
    })();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {isLogin ? t("auth.login.title") : t("auth.register.title")}
                    </CardTitle>
                    <CardDescription>
                        {isLogin ? t("auth.login.subtitle") : t("auth.register.subtitle")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {verifyBanner}

                    {pendingVerifyEmail && (
                        <div
                            className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40"
                            data-testid="banner-verify-pending"
                        >
                            <p className="font-medium text-emerald-900 dark:text-emerald-200">
                                {t("auth.verify.pendingTitle")}
                            </p>
                            <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/90">
                                {t("auth.verify.pendingDesc").replace("{email}", pendingVerifyEmail)}
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 border-emerald-300 bg-white/60 dark:border-emerald-800 dark:bg-emerald-950/60"
                                onClick={handleResend}
                                disabled={resendVerificationMutation.isPending}
                                data-testid="button-resend-verification"
                            >
                                {resendVerificationMutation.isPending && (
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                )}
                                {t("auth.verify.resendCta")}
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        disabled={isPending}
                                        data-testid="input-firstname"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        disabled={isPending}
                                        data-testid="input-lastname"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("auth.email")}</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isPending}
                                data-testid="input-email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("auth.password")}</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isPending}
                                data-testid="input-password"
                            />
                        </div>

                        <Button className="w-full" type="submit" disabled={isPending} data-testid="button-auth-submit">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? t("auth.signIn") : t("auth.signUp")}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground mt-4">
                            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="underline underline-offset-4 hover:text-primary ml-1"
                                disabled={isPending}
                                data-testid="button-toggle-mode"
                            >
                                {isLogin ? t("auth.signUp") : t("auth.signIn")}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
