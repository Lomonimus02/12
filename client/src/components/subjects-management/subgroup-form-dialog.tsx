import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InsertSubgroup, Class, Subject } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Схема валидации формы подгруппы
const subgroupFormSchema = z.object({
  name: z.string().min(1, "Название подгруппы обязательно"),
  description: z.string().optional().nullable(),
  classId: z.string().min(1, { message: "Выберите класс" }),
  studentIds: z.array(z.string()).optional().default([]),
  // Добавляем поле для связи с предметом (опционально, но рекомендуется)
  // Мы не будем сохранять это в БД напрямую, но используем для логики
  // subjectId: z.string().optional().nullable(),
});

type SubgroupFormData = z.infer<typeof subgroupFormSchema>;

interface SubgroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<InsertSubgroup, 'schoolId'>) => void;
  isLoading: boolean;
  classes: Class[];
  subjects: Subject[]; // Keep subjects prop if needed elsewhere, though not used directly here
  defaultValues?: Partial<SubgroupFormData> & { id?: number }; // Add subgroup ID to defaultValues type
}

export function SubgroupFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  classes,
  subjects,
  defaultValues // Destructure defaultValues
}: SubgroupFormDialogProps) {
  const isEditMode = !!defaultValues;
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string>(defaultValues?.classId || "");
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingSubgroupStudents, setIsLoadingSubgroupStudents] = useState(false);

  const form = useForm<SubgroupFormData>({
    resolver: zodResolver(subgroupFormSchema),
    // Initialize with defaultValues if provided, else empty strings/arrays
    defaultValues: defaultValues || {
      name: "",
      description: "",
      classId: "",
      studentIds: [],
    },
  });

  // Effect to reset form when dialog opens or defaultValues change
  useEffect(() => {
    if (isOpen) {
      const initialValues = defaultValues || {
        name: "",
        description: "",
        classId: "",
        studentIds: [],
      };
      form.reset(initialValues);
      setSelectedClassId(initialValues.classId || "");
      // Clear previously loaded students on open/reset
      setStudents([]); 
      // Ensure studentIds in form matches defaultValues initially
      form.setValue('studentIds', initialValues.studentIds || []);
    } 
    // No explicit reset on close needed if reset on open is done correctly
  }, [isOpen, defaultValues, form]);

  // Effect to load CLASS students when classId changes or is initially set
  useEffect(() => {
    const classIdToLoad = form.getValues("classId");
    if (classIdToLoad) {
      setIsLoadingStudents(true);
      // Fetch students of the selected CLASS for the selection list
      fetch(`/api/students-by-class/${classIdToLoad}`) 
        .then(res => res.ok ? res.json() : Promise.reject('Failed to load class students'))
        .then(data => setStudents(data || [])) // Ensure data is an array
        .catch((error) => {
            console.error("Error fetching class students:", error);
            setStudents([]); 
            toast({ title: "Ошибка", description: "Не удалось загрузить список учеников класса", variant: "destructive" });
         })
        .finally(() => setIsLoadingStudents(false));
    } else {
      setStudents([]);
    }
  }, [form.watch("classId"), toast]); 

  // Effect to load SUBGROUP students when in EDIT mode
  useEffect(() => {
    // Run only in edit mode and when the dialog is open
    if (isEditMode && isOpen && defaultValues?.id) {
      const subgroupId = defaultValues.id;
      console.log(`Edit mode detected for subgroup ID: ${subgroupId}. Fetching assigned students.`);
      setIsLoadingSubgroupStudents(true);
      apiRequest(`/api/student-subgroups?subgroupId=${subgroupId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Failed to fetch subgroup students');
          }
          return res.json();
        })
        .then((studentLinks) => {
          // Ensure studentLinks is an array before mapping
          const fetchedStudentIds = Array.isArray(studentLinks) 
            ? studentLinks.map((link: { studentId: number }) => link.studentId.toString()) 
            : [];
          console.log(`Fetched student IDs for subgroup ${subgroupId}:`, fetchedStudentIds);
          // Update the form field with the fetched student IDs
          form.setValue('studentIds', fetchedStudentIds, { shouldValidate: true });
        })
        .catch((error) => {
          console.error(`Error fetching students for subgroup ${subgroupId}:`, error);
          toast({ title: "Ошибка", description: `Не удалось загрузить текущих учеников подгруппы: ${error.message}`, variant: "destructive" });
          // Reset studentIds in form if fetch fails?
          // form.setValue('studentIds', defaultValues?.studentIds || []); 
        })
        .finally(() => setIsLoadingSubgroupStudents(false));
    }
  // Depend on isOpen and defaultValues.id to trigger when dialog opens in edit mode
  }, [isOpen, isEditMode, defaultValues?.id, form, toast]);

  const handleClose = () => {
    // Reset form state explicitly before calling parent onClose
    form.reset({
      name: "",
      description: "",
      classId: "",
      studentIds: [],
    });
    setSelectedClassId("");
    setStudents([]);
    onClose(); // Call parent handler
  };

  const handleFormSubmit = (values: SubgroupFormData) => {
    onSubmit({
      name: values.name,
      description: values.description || null,
      classId: parseInt(values.classId),
      // Ensure studentIds is always an array of numbers
      studentIds: (values.studentIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {/* Change title based on mode */}
          <DialogTitle>{isEditMode ? "Редактировать подгруппу" : "Добавить подгруппу"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Измените информацию о подгруппе."
              : "Введите информацию о новой подгруппе."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Класс</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      // No need to manually call setSelectedClassId here, useEffect will handle it
                      form.setValue("studentIds", []); // Reset students when class changes
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите класс" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.length === 0 ? (
                        <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                      ) : (
                        classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название подгруппы</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Группа 1 (Англ. язык)" {...field} />
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
                      placeholder="Краткое описание подгруппы"
                      {...field}
                      value={field.value || ""} // Handle null value
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="studentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ученики</FormLabel>
                  {/* Show loading indicator for class students OR subgroup students */}
                  {(isLoadingStudents || isLoadingSubgroupStudents) ? (
                    <div className="flex items-center text-muted-foreground">
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка учеников...
                    </div>
                  ) : students.length === 0 && form.getValues("classId") ? (
                    <div className="text-muted-foreground">Нет учеников в выбранном классе</div>
                  ) : !form.getValues("classId") ? (
                     <div className="text-muted-foreground">Выберите класс, чтобы увидеть учеников</div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded p-2">
                      {/* Display the list of students FROM THE CLASS */}
                      {students.map((student) => (
                        <label key={student.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            value={student.id.toString()} 
                            // Checkbox state is controlled by the form field value (field.value)
                            checked={field.value?.includes(student.id.toString())} 
                            onChange={e => {
                              const studentIdStr = student.id.toString();
                              const currentIds = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentIds, studentIdStr]);
                              } else {
                                field.onChange(currentIds.filter((id: string) => id !== studentIdStr));
                              }
                            }}
                            // Disable checkbox if still loading subgroup assignments
                            disabled={isLoadingSubgroupStudents} 
                          />
                          <span>{student.lastName} {student.firstName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <FormDescription>
                      {isLoadingSubgroupStudents 
                        ? "Загрузка назначенных учеников..." 
                        : "Выберите учеников для этой подгруппы."} 
                  </FormDescription>
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
                {/* Change button text based on mode */}
                {isEditMode ? "Сохранить изменения" : "Создать подгруппу"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}