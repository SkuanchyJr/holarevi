import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const { loginMutation, registerMutation, isAuthenticated } = useAuth();
    const [, setLocation] = useLocation();
    const { language } = useLanguage();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: ""
    });

    // Redirect authenticated users — use useEffect to avoid render-phase state updates
    useEffect(() => {
        if (isAuthenticated) {
            setLocation(`/${language}/`);
        }
    }, [isAuthenticated, language, setLocation]);

    if (isAuthenticated) return null;

    const isPending = loginMutation.isPending || registerMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            if (!formData.email || !formData.password) {
                toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
                return;
            }
            loginMutation.mutate({ email: formData.email, password: formData.password }, {
                onError: (err: any) => {
                    toast({ title: "Login Failed", description: err.message, variant: "destructive" });
                }
            });
        } else {
            if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
                toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
                return;
            }
            if (formData.password.length < 8) {
                toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
                return;
            }
            registerMutation.mutate({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName
            }, {
                onError: (err: any) => {
                    toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
                }
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {isLogin ? "Welcome back" : "Create an account"}
                    </CardTitle>
                    <CardDescription>
                        {isLogin ? "Enter your email to sign in to your account" : "Enter your information to create an account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input id="firstName" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} disabled={isPending} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input id="lastName" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} disabled={isPending} />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" value={formData.email} onChange={handleChange} disabled={isPending} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} disabled={isPending} />
                        </div>

                        <Button className="w-full" type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? "Sign In" : "Sign Up"}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground mt-4">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="underline underline-offset-4 hover:text-primary"
                                disabled={isPending}
                            >
                                {isLogin ? "Sign up" : "Sign in"}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
