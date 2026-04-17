import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Check, Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type BusinessType =
  | "restaurant"
  | "hotel"
  | "nail_beauty"
  | "clinic"
  | "gym"
  | "car_repair"
  | "retail"
  | "cafe"
  | "vet"
  | "other";

interface Review {
  text: string;
  sentiment: "positive" | "negative";
  stars: number;
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= count
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewDemo() {
  const { t } = useLanguage();
  
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState<string | null>(null);
  const [showDemoPopup, setShowDemoPopup] = useState(false);
  const [timeSaved, setTimeSaved] = useState(0);

  // Cast since we know the structure in the JSON
  const reviewTexts = t(`generator.reviews.${businessType}`, { returnObjects: true }) as string[] | string;
  const replyTexts = t(`generator.replies.${businessType}`, { returnObjects: true }) as string[] | string;
  const businessLabels = t("generator.businessTypes", { returnObjects: true }) as Record<BusinessType, string>;

  const reviews: Review[] = useMemo(() => {
    const texts = Array.isArray(reviewTexts) ? reviewTexts : [];
    return texts.map((text, index) => ({
      text,
      sentiment: index < 2 ? "positive" : "negative",
      stars: index === 0 ? 5 : index === 1 ? 5 : index === 2 ? 2 : 1,
    }));
  }, [reviewTexts]);

  const handleBusinessTypeChange = (value: BusinessType) => {
    setBusinessType(value);
    setSelectedReviewIndex(null);
    setGeneratedReply(null);
  };

  const handleReviewSelect = (index: number) => {
    setSelectedReviewIndex(index);
    setGeneratedReply(null);
  };

  const handleGenerate = () => {
    if (selectedReviewIndex === null) return;

    setIsGenerating(true);
    setGeneratedReply(null);

    setTimeout(() => {
      const reply = Array.isArray(replyTexts) ? replyTexts[selectedReviewIndex] : "";
      setGeneratedReply(reply);
      setIsGenerating(false);
      setTimeSaved((prev) => prev + 4);
    }, 800);
  };

  const handleApprove = () => {
    setShowDemoPopup(true);
    setTimeout(() => setShowDemoPopup(false), 2000);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            {t("generator.badge")}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("generator.sectionTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("generator.sectionDescription")}
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("generator.cardTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business-type">{t("generator.businessTypeLabel")}</Label>
                <Select
                  value={businessType}
                  onValueChange={(val) =>
                    handleBusinessTypeChange(val as BusinessType)
                  }
                >
                  <SelectTrigger
                    id="business-type"
                    data-testid="select-business-type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">{businessLabels.restaurant}</SelectItem>
                    <SelectItem value="hotel">{businessLabels.hotel}</SelectItem>
                    <SelectItem value="nail_beauty">{businessLabels.nail_beauty}</SelectItem>
                    <SelectItem value="clinic">{businessLabels.clinic}</SelectItem>
                    <SelectItem value="gym">{businessLabels.gym}</SelectItem>
                    <SelectItem value="car_repair">{businessLabels.car_repair}</SelectItem>
                    <SelectItem value="retail">{businessLabels.retail}</SelectItem>
                    <SelectItem value="cafe">{businessLabels.cafe}</SelectItem>
                    <SelectItem value="vet">{businessLabels.vet}</SelectItem>
                    <SelectItem value="other">{businessLabels.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>{t("generator.selectReviewLabel")}</Label>
                <div className="grid gap-3">
                  {reviews.map((review, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedReviewIndex === index
                          ? "ring-2 ring-primary border-primary"
                          : ""
                      }`}
                      onClick={() => handleReviewSelect(index)}
                      data-testid={`card-review-${index + 1}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed flex-1">
                            "{review.text}"
                          </p>
                          <StarRating count={review.stars} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={selectedReviewIndex === null || isGenerating}
                className="w-full"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <span className="animate-pulse">{t("generator.typingText")}</span>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("generator.generateButton")}
                  </>
                )}
              </Button>

              {generatedReply && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{t("generator.responseTitle")}</h3>
                    <Badge variant="secondary">
                      {businessLabels[businessType]}
                    </Badge>
                  </div>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <p
                        className="text-foreground leading-relaxed"
                        data-testid="text-generated-reply"
                      >
                        {generatedReply}
                      </p>
                    </CardContent>
                  </Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      onClick={handleApprove}
                      className="flex-shrink-0"
                      data-testid="button-approve"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {t("generator.approveButton")}
                    </Button>
                    <span
                      className="text-sm text-muted-foreground"
                      data-testid="text-time-saved"
                    >
                      {t("generator.timeSaved")} <strong>{timeSaved}</strong> {t("generator.timeUnit")}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showDemoPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <Card className="max-w-sm mx-4 animate-in fade-in zoom-in duration-200">
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-medium">{t("generator.demoPopupTitle")}</p>
              <p className="text-muted-foreground mt-2">
                {t("generator.demoPopupDescription")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
