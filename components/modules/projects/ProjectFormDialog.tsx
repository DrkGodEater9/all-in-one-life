"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { NONE, STATUS_COLUMNS, STATUS_LABEL } from "./constants";
import { TagPicker } from "./TagPicker";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectCategory,
  type ProjectTag,
} from "./types";

const NEW_CATEGORY = "__new__";

const schema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(200),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(PROJECT_STATUSES),
    category: z.string(),
    newCategory: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.category !== NEW_CATEGORY || Boolean(v.newCategory?.trim()), {
    message: "Escribe el nombre de la categoría",
    path: ["newCategory"],
  });

type FormValues = z.infer<typeof schema>;

export function ProjectFormDialog({
  open,
  onOpenChange,
  categories,
  tags,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProjectCategory[];
  tags: ProjectTag[];
  onCreated: (project: Project) => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", status: "idea", category: NONE },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        status: "idea",
        category: NONE,
        newCategory: "",
      });
      setSelectedTags([]);
    }
  }, [open, reset]);

  const category = watch("category");

  async function onSubmit(values: FormValues) {
    try {
      let categoryId: number | null = null;

      if (values.category === NEW_CATEGORY && values.newCategory?.trim()) {
        const createdCategory = await api.post<ProjectCategory>(
          "/projects/categories",
          { name: values.newCategory.trim() }
        );
        categoryId = createdCategory.id;
      } else if (values.category !== NONE) {
        categoryId = Number(values.category);
      }

      const project = await api.post<Project>("/projects", {
        title: values.title,
        description: values.description?.trim() ? values.description.trim() : null,
        status: values.status,
        categoryId,
        tagNames: selectedTags,
      });

      onCreated(project);
      onOpenChange(false);
      toast({ title: "Proyecto creado", description: project.title });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo crear el proyecto",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Una idea suelta también cuenta. Podrás editar todo después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-title">Título</Label>
              <Input
                id="project-title"
                autoFocus
                placeholder="Ej. App de finanzas personales"
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-xs text-danger">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                rows={3}
                placeholder="De qué va el proyecto"
                {...register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin categoría</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={NEW_CATEGORY}>+ Nueva categoría</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {category === NEW_CATEGORY ? (
              <div className="space-y-1.5">
                <Label htmlFor="project-new-category">Nombre de la categoría</Label>
                <Input
                  id="project-new-category"
                  placeholder="Ej. Software"
                  {...register("newCategory")}
                />
                {errors.newCategory ? (
                  <p className="text-xs text-danger">{errors.newCategory.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Etiquetas</Label>
              <TagPicker
                value={selectedTags}
                onChange={setSelectedTags}
                suggestions={tags}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
