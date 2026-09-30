"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Ruler } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { axisProps, lineProps, tooltipProps } from "@/components/modules/gym/chart-theme";
import {
  MEASUREMENT_FIELDS,
  formatDateShort,
  formatKg,
  todayKey,
  type Measurement,
  type MeasurementKey,
} from "@/components/modules/gym/types";

/** Los inputs numéricos viajan como texto; se convierten al enviar. */
const measureField = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 300;
  }, "Ingresa un valor entre 0 y 300");

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    chestCm: measureField,
    waistCm: measureField,
    hipsCm: measureField,
    armsCm: measureField,
    thighsCm: measureField,
  })
  .refine(
    (values) =>
      MEASUREMENT_FIELDS.some((field) => values[field.key].trim() !== ""),
    { message: "Registra al menos una medida", path: ["chestCm"] }
  );

type FormValues = z.infer<typeof schema>;

function emptyForm(): FormValues {
  return {
    date: todayKey(),
    chestCm: "",
    waistCm: "",
    hipsCm: "",
    armsCm: "",
    thighsCm: "",
  };
}

export function MeasurementsTab() {
  const [measurements, setMeasurements] = React.useState<Measurement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [metric, setMetric] = React.useState<MeasurementKey>("waistCm");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(),
  });

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<Measurement[]>("/gym/measurements");
        if (active) setMeasurements(data);
      } catch (error) {
        if (active) {
          toast({
            variant: "destructive",
            title: "No se pudieron cargar las medidas",
            description:
              error instanceof ApiClientError ? error.message : "Intenta de nuevo",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    const num = (value: string) =>
      value.trim() === "" ? null : Number(value.replace(",", "."));

    try {
      const saved = await api.post<Measurement>("/gym/measurements", {
        date: values.date,
        chestCm: num(values.chestCm),
        waistCm: num(values.waistCm),
        hipsCm: num(values.hipsCm),
        armsCm: num(values.armsCm),
        thighsCm: num(values.thighsCm),
      });
      setMeasurements((current) =>
        [...current, saved].sort((a, b) => a.date.localeCompare(b.date))
      );
      reset(emptyForm());
      toast({ title: "Medidas guardadas" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron guardar",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    }
  });

  const chartData = React.useMemo(
    () =>
      measurements
        .filter((measurement) => measurement[metric] !== null)
        .map((measurement) => ({
          label: formatDateShort(measurement.date),
          valor: measurement[metric] as number,
        })),
    [measurements, metric]
  );

  const latest = measurements.length ? measurements[measurements.length - 1] : null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Medidas"
        description="Registro corporal en centímetros."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nuevo registro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="measurement-date">Fecha</Label>
              <Input
                id="measurement-date"
                type="date"
                className="font-mono"
                {...register("date")}
              />
              {errors.date ? (
                <p className="text-xs text-danger">{errors.date.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`measure-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`measure-${field.key}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    placeholder="cm"
                    className="h-11 font-mono tabular-nums"
                    {...register(field.key)}
                  />
                  {errors[field.key] ? (
                    <p className="text-xs text-danger">{errors[field.key]?.message}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar medidas"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Evolución</CardTitle>
          <Select
            value={metric}
            onValueChange={(value) => setMetric(value as MeasurementKey)}
          >
            <SelectTrigger className="w-[150px]" aria-label="Medida">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASUREMENT_FIELDS.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={Ruler}
              title="Sin registros de esta medida"
              description="Guarda una medida para ver su evolución."
            />
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                  >
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis width={44} unit=" cm" domain={["auto", "auto"]} {...axisProps} />
                    <Tooltip {...tooltipProps} />
                    <Line type="monotone" dataKey="valor" name="cm" {...lineProps} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {latest ? (
                <div className="grid grid-cols-3 gap-3 border-t border-border pt-3 sm:grid-cols-5">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <p className="font-mono text-sm tabular-nums text-text">
                        {formatKg(latest[field.key])}
                      </p>
                      <p className="text-[11px] text-text-3">{field.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
