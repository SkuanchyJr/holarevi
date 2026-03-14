import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Users } from "lucide-react";
import type { TeamMember } from "@shared/schema";

type PendingInvitation = TeamMember & { ownerName: string };

export function InvitationPopup() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: pendingInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/invitations/pending"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/invitations/${id}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({
        title: t("invitations.accepted"),
        description: t("invitations.acceptedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("invitations.errorAccept"),
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/invitations/${id}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/pending"] });
      toast({
        title: t("invitations.declined"),
        description: t("invitations.declinedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("invitations.errorDecline"),
        variant: "destructive",
      });
    },
  });

  const currentInvitation = pendingInvitations?.[0];
  const isOpen = !!currentInvitation;
  const isPending = acceptMutation.isPending || declineMutation.isPending;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("invitations.title")}
          </DialogTitle>
          <DialogDescription>
            {t("invitations.description").replace("{name}", currentInvitation.ownerName)}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t("invitations.roleAssigned")}: <span className="font-medium">{currentInvitation.role}</span>
          </p>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => declineMutation.mutate(currentInvitation.id)}
            disabled={isPending}
            data-testid="button-decline-invitation"
          >
            {declineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("invitations.decline")}
          </Button>
          <Button
            onClick={() => acceptMutation.mutate(currentInvitation.id)}
            disabled={isPending}
            data-testid="button-accept-invitation"
          >
            {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("invitations.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
