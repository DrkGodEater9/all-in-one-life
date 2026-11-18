"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ApplicationsTab } from "./ApplicationsTab";
import { PortalsTab } from "./PortalsTab";

export function JobsClient() {
  // Los portales alimentan las sugerencias de "dónde te postulaste": al
  // cambiarlos se recarga la pestaña de postulaciones.
  const [portalsVersion, setPortalsVersion] = React.useState(0);

  return (
    <Tabs defaultValue="applications">
      <TabsList>
        <TabsTrigger value="applications">Postulaciones</TabsTrigger>
        <TabsTrigger value="portals">Portales</TabsTrigger>
      </TabsList>
      <TabsContent value="applications" className="mt-4">
        <ApplicationsTab reloadKey={portalsVersion} />
      </TabsContent>
      <TabsContent value="portals" className="mt-4">
        <PortalsTab onChanged={() => setPortalsVersion((v) => v + 1)} />
      </TabsContent>
    </Tabs>
  );
}
