"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, authClient } from "@/lib/auth-client";
import { Loader2, ArrowLeft, Trash2, Clock, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { VeilleResultDisplay } from "@/components/veille-result-display";

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

interface HistoriqueEntry {
  id: number;
  veilleId: number;
  userId: string;
  contenu: string;
  createdAt: string;
}

export default function VeilleDetailPage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const params = useParams();
  const veilleId = params.id as string;

  const [veille, setVeille] = useState<Veille | null>(null);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && veilleId) {
      fetchVeilleData();
    }
  }, [session, veilleId]);

  const fetchVeilleData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Fetch veille details
      const veilleResponse = await fetch(`/api/veille/${veilleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!veilleResponse.ok) {
        if (veilleResponse.status === 404) {
          toast.error("Veille introuvable");
          router.push("/dashboard");
          return;
        }
        throw new Error("Échec de la récupération de la veille");
      }

      const veilleData = await veilleResponse.json();
      setVeille(veilleData);

      // Fetch historique
      const historiqueResponse = await fetch(
        `/api/historique?veilleId=${veilleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (historiqueResponse.ok) {
        const historiqueData = await historiqueResponse.json();
        setHistorique(historiqueData);
      }
    } catch (error) {
      toast.error("Erreur lors de la récupération des données");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette veille ?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/veille/${veilleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Échec de la suppression");
      }

      toast.success("Veille supprimée avec succès");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      setIsDeleting(false);
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

  if (!session?.user || !veille) {
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
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>

          {/* Veille Details */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{veille.titre}</CardTitle>
                  <CardDescription className="text-base">
                    {veille.sujet}
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Informations
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Créée le : {formatDate(veille.createdAt)}</p>
                  {veille.updatedAt !== veille.createdAt && (
                    <p>Mise à jour le : {formatDate(veille.updatedAt)}</p>
                  )}
                </div>
              </div>

              {veille.contexte && (
                <div>
                  <h3 className="font-semibold mb-2">Contexte</h3>
                  <div className="bg-muted p-4 rounded-lg text-sm">
                    {veille.contexte}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Résultat de la veille */}
          {veille.resultat && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Résultat de la Veille
              </h2>
              <VeilleResultDisplay content={veille.resultat} />
            </div>
          )}

          {!veille.resultat && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-8">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Cette veille n'a pas encore de résultat généré.
              </p>
            </div>
          )}

          {/* Historique Section */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>
                Historique complet de cette veille
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historique.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun historique pour cette veille</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {historique.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.createdAt)}
                      </div>
                      <VeilleResultDisplay content={entry.contenu} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}