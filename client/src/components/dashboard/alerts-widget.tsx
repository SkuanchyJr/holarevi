import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, MessageSquare, Star, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function AlertsWidget() {
    const queryClient = useQueryClient();
    const { data: alerts, isLoading } = useQuery<any[]>({
        queryKey: ["/api/alerts"],
    });

    const resolveMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("POST", `/api/alerts/${id}/resolve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        },
    });

    if (isLoading) return null;
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Attention Required
                </h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {alerts.length} unresolved alerts
                </span>
            </div>

            <div className="grid gap-4">
                {alerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-destructive overflow-hidden relative group">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                        >
                            <X className="w-4 h-4" />
                        </Button>

                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-lg">
                                        {alert.review?.rating}
                                        <Star className="w-3 h-3 fill-current ml-0.5" />
                                    </div>
                                </div>

                                <div className="flex-grow space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm">{alert.review?.reviewerName}</span>
                                            <span className="text-xs text-muted-foreground italic">
                                                {alert.review?.reviewedAt ? format(new Date(alert.review.reviewedAt), "PPP") : ""}
                                            </span>
                                        </div>
                                        <p className="text-sm line-clamp-2 italic text-muted-foreground leading-relaxed">
                                            "{alert.review?.comment}"
                                        </p>
                                    </div>

                                    {alert.review?.generatedReply && (
                                        <div className="bg-muted/50 p-4 rounded-lg border border-dashed relative">
                                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-primary">
                                                <Sparkles className="w-3 h-3" />
                                                SUGGESTED AI REPLY
                                            </div>
                                            <p className="text-sm leading-relaxed mb-4">
                                                {alert.review.generatedReply}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="default" className="h-8">
                                                    Send Reply
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8">
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 ml-auto text-muted-foreground hover:text-foreground"
                                                    onClick={() => resolveMutation.mutate(alert.id)}
                                                >
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
