"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, authClient } from "@/lib/auth-client";
import { Loader2, Plus, Search, Trash2, Eye, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Veille {
  id: number;
  userId: string;
  titre: string;
  sujet: string;
  contexte: string | null;
  resultat: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [veilles, setVeilles] = useState<Veille[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchVeilles();
    }
  }, [session]);

  const fetchVeilles = async (search?: string) => {
    try {
      setIsSearching(true);
      const token = localStorage.getItem("bearer_token");
      const url = search 
        ? `/api/veille?search=${encodeURIComponent(search)}`
        : "/api/veille";
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Échec de la récupération des veilles");
      }

      const data = await response.json();
      setVeilles(data);
    } catch (error) {
      toast.error("Erreur lors de la récupération des veilles");
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVeilles(searchQuery);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette veille ?")) {
      return;
    }

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/veille/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Échec de la suppression");
      }

      toast.success("Veille supprimée avec succès");
      fetchVeilles();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Erreur lors de la déconnexion");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Veille IA</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {session.user.name}
              </span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Mes Veilles</h1>
              <p className="text-muted-foreground">
                Gérez et consultez toutes vos veilles automatisées
              </p>
            </div>
            <Button size="lg" onClick={() => router.push("/veille/nouvelle")}>
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle Veille
            </Button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre ou sujet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Rechercher"
                )}
              </Button>
              {searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    fetchVeilles();
                  }}
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </form>

          {/* Veilles List */}
          {veilles.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery ? "Aucun résultat trouvé" : "Aucune veille pour le moment"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "Essayez avec d'autres mots-clés"
                        : "Commencez par créer votre première veille automatisée"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => router.push("/veille/nouvelle")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer ma première veille
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {veilles.map((veille) => (
                <Card key={veille.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{veille.titre}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {veille.sujet}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-xs text-muted-foreground">
                        Créée le {formatDate(veille.createdAt)}
                      </div>
                      {veille.resultat && (
                        <div className="text-sm text-muted-foreground line-clamp-3 bg-muted p-3 rounded-md">
                          {veille.resultat}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/veille/${veille.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(veille.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
