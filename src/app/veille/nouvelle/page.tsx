"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, authClient } from "@/lib/auth-client";
import { Loader2, ArrowLeft, Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NouvelleVeillePage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    titre: "",
    sujet: "",
    contexte: "",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titre.trim() || !formData.sujet.trim()) {
      toast.error("Veuillez remplir le titre et le sujet");
      return;
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem("bearer_token");

      // Create the veille first
      const createResponse = await fetch("/api/veille", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titre: formData.titre.trim(),
          sujet: formData.sujet.trim(),
          contexte: formData.contexte.trim() || null,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Échec de la création de la veille");
      }

      const veille = await createResponse.json();

      // Generate content with OpenAI
      const generateResponse = await fetch("/api/generate-veille", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          veilleId: veille.id,
          sujet: formData.sujet.trim(),
          contexte: formData.contexte.trim() || undefined,
        }),
      });

      if (!generateResponse.ok) {
        toast.error("Veille créée mais erreur lors de la génération du contenu");
        router.push(`/veille/${veille.id}`);
        return;
      }

      toast.success("Veille créée et générée avec succès !");
      router.push(`/veille/${veille.id}`);
    } catch (error) {
      toast.error("Erreur lors de la création de la veille");
      console.error(error);
      setIsGenerating(false);
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

  if (isPending) {
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
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.push("/dashboard")}
            disabled={isGenerating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Créer une Nouvelle Veille</CardTitle>
              <CardDescription>
                Remplissez les informations ci-dessous pour générer votre veille automatisée
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="titre">
                    Titre de la veille <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="titre"
                    placeholder="Ex: Veille technologique sur l'IA"
                    value={formData.titre}
                    onChange={(e) =>
                      setFormData({ ...formData, titre: e.target.value })
                    }
                    required
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Donnez un titre descriptif à votre veille
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sujet">
                    Sujet de la veille <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="sujet"
                    placeholder="Ex: Les dernières avancées en intelligence artificielle et machine learning"
                    value={formData.sujet}
                    onChange={(e) =>
                      setFormData({ ...formData, sujet: e.target.value })
                    }
                    required
                    disabled={isGenerating}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Décrivez précisément le sujet que vous souhaitez surveiller
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contexte">Contexte additionnel (optionnel)</Label>
                  <Textarea
                    id="contexte"
                    placeholder="Ex: Focus particulier sur les applications en entreprise et les impacts sur le marché du travail"
                    value={formData.contexte}
                    onChange={(e) =>
                      setFormData({ ...formData, contexte: e.target.value })
                    }
                    disabled={isGenerating}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ajoutez du contexte pour affiner la génération de votre veille
                  </p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Génération automatique par IA</p>
                      <p className="text-muted-foreground">
                        Notre système utilisera OpenAI pour générer automatiquement une veille
                        détaillée basée sur vos informations. Cela peut prendre quelques secondes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Créer et Générer
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    disabled={isGenerating}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
