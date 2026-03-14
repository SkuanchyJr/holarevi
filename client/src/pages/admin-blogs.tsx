import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  LogOut,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  Eye,
  EyeOff,
  ExternalLink,
  Home,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlogFormData {
  title: string;
  subtitle: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
}

const defaultFormData: BlogFormData = {
  title: "",
  subtitle: "",
  slug: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  published: false,
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminBlogs() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState<BlogFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetchBlogs();
  }, []);

  const checkAuthAndFetchBlogs = async () => {
    try {
      const sessionResponse = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated) {
        setLocation("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/blogs", {
        credentials: "include",
      });

      if (response.status === 401) {
        setLocation("/admin/login");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setBlogs(data.blogs);
      } else {
        setError("Failed to load blogs");
      }
    } catch (err) {
      setError("An error occurred while loading blogs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/admin/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const openCreateDialog = () => {
    setEditingBlog(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      subtitle: blog.subtitle || "",
      slug: blog.slug,
      content: blog.content,
      metaTitle: blog.metaTitle || "",
      metaDescription: blog.metaDescription || "",
      published: blog.published,
    });
    setIsDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: !editingBlog ? generateSlug(title) : prev.slug,
      metaTitle: !prev.metaTitle ? title : prev.metaTitle,
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Error",
        description: "Slug is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const url = editingBlog
        ? `/api/admin/blogs/${editingBlog.id}`
        : "/api/admin/blogs";
      const method = editingBlog ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title.trim(),
          subtitle: formData.subtitle.trim() || null,
          slug: formData.slug.trim(),
          content: formData.content.trim(),
          metaTitle: formData.metaTitle.trim() || null,
          metaDescription: formData.metaDescription.trim() || null,
          published: formData.published,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: editingBlog ? "Blog updated" : "Blog created",
        });
        setIsDialogOpen(false);
        checkAuthAndFetchBlogs();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to save blog",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while saving",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Blog deleted",
        });
        setBlogs(blogs.filter((b) => b.id !== id));
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete blog",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while deleting",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublished = async (blog: Blog) => {
    try {
      const response = await fetch(`/api/admin/blogs/${blog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published: !blog.published }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: blog.published ? "Blog unpublished" : "Blog published",
        });
        checkAuthAndFetchBlogs();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update blog",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-title">
                Blog Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage blog posts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreateDialog}
              data-testid="button-create-blog"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Blog
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {blogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No blog posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first blog post to get started
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Create Blog Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <Card key={blog.id} data-testid={`card-blog-${blog.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg truncate">
                          {blog.title}
                        </CardTitle>
                        <Badge variant={blog.published ? "default" : "secondary"}>
                          {blog.published ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </div>
                      {blog.subtitle && (
                        <CardDescription className="truncate">
                          {blog.subtitle}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {blog.published && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-preview-${blog.id}`}
                        >
                          <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(blog)}
                        data-testid={`button-edit-${blog.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(blog.id)}
                        disabled={deletingId === blog.id}
                        data-testid={`button-delete-${blog.id}`}
                      >
                        {deletingId === blog.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(blog.createdAt), "MMM d, yyyy")}
                    </span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      /blog/{blog.slug}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => handleTogglePublished(blog)}
                    >
                      {blog.published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlog ? "Edit Blog Post" : "Create Blog Post"}
            </DialogTitle>
            <DialogDescription>
              {editingBlog
                ? "Update the blog post details"
                : "Fill in the details for your new blog post"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter blog title"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                placeholder="Enter subtitle (optional)"
                data-testid="input-subtitle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/blog/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: generateSlug(e.target.value) })
                  }
                  placeholder="url-slug"
                  className="font-mono"
                  data-testid="input-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content * (Markdown supported)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Write your blog content here..."
                className="min-h-[200px] font-mono text-sm"
                data-testid="input-content"
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">SEO Settings</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder="SEO title (defaults to blog title)"
                    data-testid="input-meta-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, metaDescription: e.target.value })
                    }
                    placeholder="SEO description for search engines"
                    className="min-h-[80px]"
                    data-testid="input-meta-description"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-muted-foreground">
                  Make this post visible to the public
                </p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, published: checked })
                }
                data-testid="switch-published"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-testid="button-save"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : editingBlog ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
