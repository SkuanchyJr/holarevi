import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Loader2,
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Home,
  Building,
  ArrowUpDown,
  Check,
  Clock,
  AlertCircle,
  Zap,
  Hand,
} from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  restaurantId: string;
  googleReviewId: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  rating: number;
  comment: string | null;
  language: string | null;
  sentiment: string | null;
  generatedReply: string | null;
  postedReply: string | null;
  replyStatus: string | null;
  reviewedAt: string | null;
  repliedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  restaurantName: string | null;
  autoPostEnabled: boolean | null;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AdminReviewsResponse {
  success: boolean;
  reviews: Review[];
  restaurants: Restaurant[];
  pagination: Pagination;
}

export default function AdminReviews() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Filter states
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedReplyStatus, setSelectedReplyStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Check admin authentication
  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(data.authenticated === true);
        if (!data.authenticated) {
          setLocation("/admin/login");
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setLocation("/admin/login");
      });
  }, [setLocation]);

  // Fetch reviews with filters
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchReviews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", "25");
        params.set("sort", sortOrder);

        if (selectedRestaurant !== "all") {
          params.set("restaurantId", selectedRestaurant);
        }
        if (selectedRating !== "all") {
          params.set("rating", selectedRating);
        }
        if (selectedReplyStatus === "replied") {
          params.set("replied", "true");
        } else if (selectedReplyStatus === "not_replied") {
          params.set("replied", "false");
        }

        const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
        }

        const data: AdminReviewsResponse = await response.json();
        setReviews(data.reviews);
        setRestaurants(data.restaurants);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [isAuthenticated, currentPage, selectedRestaurant, selectedRating, selectedReplyStatus, sortOrder]);

  // Reset page when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setLocation("/admin/login");
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  // Get reply status badge
  const getReplyStatusBadge = (review: Review) => {
    if (review.replyStatus === "posted" || review.postedReply) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
          <Check className="h-3 w-3 mr-1" />
          Posted
        </Badge>
      );
    }
    if (review.generatedReply && review.replyStatus === "pending") {
      return (
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircle className="h-3 w-3 mr-1" />
        Not Replied
      </Badge>
    );
  };

  // Get auto-post badge
  const getAutoPostBadge = (autoPostEnabled: boolean | null) => {
    if (autoPostEnabled) {
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
          <Zap className="h-3 w-3 mr-1" />
          Auto-Post
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Hand className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    );
  };

  // Get language badge
  const getLanguageBadge = (language: string | null) => {
    if (!language) return null;
    const langMap: Record<string, string> = {
      es: "Spanish",
      ca: "Catalan",
      en: "English",
    };
    return (
      <Badge variant="outline" className="text-xs">
        {langMap[language] || language.toUpperCase()}
      </Badge>
    );
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="link-admin-home">
                <Home className="h-4 w-4 mr-2" />
                Admin Home
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">All Reviews</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Filters & Sorting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Restaurant Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Restaurant</label>
                <Select
                  value={selectedRestaurant}
                  onValueChange={(value) => handleFilterChange(setSelectedRestaurant, value)}
                >
                  <SelectTrigger data-testid="select-restaurant-filter">
                    <SelectValue placeholder="All Restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Restaurants</SelectItem>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Rating</label>
                <Select
                  value={selectedRating}
                  onValueChange={(value) => handleFilterChange(setSelectedRating, value)}
                >
                  <SelectTrigger data-testid="select-rating-filter">
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reply Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Reply Status</label>
                <Select
                  value={selectedReplyStatus}
                  onValueChange={(value) => handleFilterChange(setSelectedReplyStatus, value)}
                >
                  <SelectTrigger data-testid="select-reply-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="not_replied">Not Replied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sort By</label>
                <Select
                  value={sortOrder}
                  onValueChange={(value) => handleFilterChange(setSortOrder, value)}
                >
                  <SelectTrigger data-testid="select-sort-order">
                    <SelectValue placeholder="Newest First" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {pagination && (
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {reviews.length} of {pagination.totalCount} reviews
            {pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && reviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reviews found matching your filters.</p>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        {!isLoading && !error && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="overflow-hidden" data-testid={`card-review-${review.id}`}>
                <CardContent className="p-5">
                  {/* Review Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {review.reviewerPhotoUrl ? (
                        <img
                          src={review.reviewerPhotoUrl}
                          alt={review.reviewerName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {review.reviewerName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium" data-testid={`text-reviewer-name-${review.id}`}>
                          {review.reviewerName?.trim() || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          {review.reviewedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.reviewedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getLanguageBadge(review.language)}
                      {getReplyStatusBadge(review)}
                      {getAutoPostBadge(review.autoPostEnabled)}
                    </div>
                  </div>

                  {/* Restaurant Info */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span data-testid={`text-restaurant-name-${review.id}`}>
                      {review.restaurantName || "Unknown Restaurant"}
                    </span>
                  </div>

                  {/* Review Comment */}
                  {review.comment && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-review-comment-${review.id}`}>
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {/* Replies Section */}
                  <div className="space-y-3">
                    {/* Generated Reply */}
                    {review.generatedReply && (
                      <div className="border-l-4 border-amber-400 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            AI Generated Reply
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-generated-reply-${review.id}`}>
                          {review.generatedReply}
                        </p>
                      </div>
                    )}

                    {/* Posted Reply */}
                    {review.postedReply && (
                      <div className="border-l-4 border-green-500 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            Posted Reply
                          </span>
                          {review.repliedAt && (
                            <span className="text-xs text-muted-foreground">
                              on {format(new Date(review.repliedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-posted-reply-${review.id}`}>
                          {review.postedReply}
                        </p>
                      </div>
                    )}

                    {/* No Reply */}
                    {!review.generatedReply && !review.postedReply && (
                      <p className="text-sm text-muted-foreground italic">No reply generated yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setCurrentPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
