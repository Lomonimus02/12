// client/src/components/subjects-management/subject-form-dialog.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { InsertSubject } from "@shared/schema";
import { Loader2 } from "lucide-react";
import React from "react";

// Схема валидации формы предмета
const subjectFormSchema = z.object({
  name: z.string().min(1, "Название предмета обязательно"),
  description: z.string().optional().nullable(),
});

type SubjectFormData = z.infer<typeof subjectFormSchema>;

interface SubjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<SubjectFormData>;
}

export function SubjectFormDialog({ isOpen, onClose, onSubmit, isLoading, defaultValues }: SubjectFormDialogProps) {
  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
    },
  });

  // Сброс формы при закрытии диалога
  const handleClose = () => {
    form.reset(defaultValues || { name: "", description: "" });
    onClose();
  };

  // Сброс и установка значений при открытии диалога (для редактирования)
  React.useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues || { name: "", description: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues]);

  const isEdit = Boolean(defaultValues && (defaultValues.name || defaultValues.description));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать предмет" : "Добавить предмет"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Измените название и описание предмета." : "Введите название и описание нового предмета."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название предмета</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Математика" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (необязательно)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Краткое описание предмета"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Сохранить изменения" : "Создать предмет"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}