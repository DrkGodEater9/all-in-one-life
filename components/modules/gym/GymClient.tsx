"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { RoutinesTab } from "@/components/modules/gym/RoutinesTab";
import { WorkoutsTab } from "@/components/modules/gym/WorkoutsTab";
import { ProgressTab } from "@/components/modules/gym/ProgressTab";
import { MeasurementsTab } from "@/components/modules/gym/MeasurementsTab";
import type { Routine } from "@/components/modules/gym/types";

export function GymClient() {
  const [routines, setRoutines] = React.useState<Routine[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadRoutines = React.useCallback(async () => {
    try {
      setRoutines(await api.get<Routine[]>("/gym/routines"));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las rutinas",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRoutines();
  }, [loadRoutines]);

  return (
    <Tabs defaultValue="rutinas">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
        <TabsTrigger value="entrenos">Entrenos</TabsTrigger>
        <TabsTrigger value="progreso">Progreso</TabsTrigger>
        <TabsTrigger value="medidas">Medidas</TabsTrigger>
      </TabsList>

      <TabsContent value="rutinas">
        <RoutinesTab
          routines={routines}
          loading={loading}
          onChanged={loadRoutines}
        />
      </TabsContent>
      <TabsContent value="entrenos">
        <WorkoutsTab />
      </TabsContent>
      <TabsContent value="progreso">
        <ProgressTab />
      </TabsContent>
      <TabsContent value="medidas">
        <MeasurementsTab />
      </TabsContent>
    </Tabs>
  );
}
