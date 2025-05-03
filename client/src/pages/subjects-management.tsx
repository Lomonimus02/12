// client/src/pages/subjects-management.tsx
import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useRoleCheck } from "@/hooks/use-role-check";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Subject, Subgroup, Class, InsertSubgroup, InsertSubject, School, Schedule } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Loader2, Filter, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubjectSubgroupCard, SubjectSubgroupItem } from "@/components/subjects-management/subject-subgroup-card";
import { SubjectFormDialog } from "@/components/subjects-management/subject-form-dialog";
import { SubgroupFormDialog } from "@/components/subjects-management/subgroup-form-dialog";
import { ClassCard } from "@/components/subjects-management/class-card"; // Импортируем новую карточку
import { useLocation } from "wouter"; // Импортируем для навигации
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SubjectsManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSchoolAdmin, isAdmin } = useRoleCheck();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation(); // Получаем функцию навигации

  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isSubgroupDialogOpen, setIsSubgroupDialogOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<SubjectSubgroupItem | null>(null); // Для отслеживания выбранного предмета/подгруппы
  const [relatedClasses, setRelatedClasses] = useState<Class[]>([]); // Классы для выбранного элемента
  const [isLoadingRelatedClasses, setIsLoadingRelatedClasses] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SubjectSubgroupItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<SubjectSubgroupItem | null>(null);

  // *** DEBUG: Track original values
  const [lastEditedSubject, setLastEditedSubject] = useState<any>(null);

  // Определяем ID школы администратора
  const schoolId = user?.schoolId || null;

  // Fetch subjects for the school
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      console.log("*** DEBUG: Fetching subjects with schoolId:", schoolId);
      const res = await apiRequest(`/api/subjects?schoolId=${schoolId}`);
      const data = await res.json();
      console.log("*** DEBUG: Fetched subjects data:", data);
      return data;
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch subgroups for the school
  const { data: subgroups = [], isLoading: subgroupsLoading } = useQuery<Subgroup[]>({
    queryKey: ["/api/subgroups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/subgroups?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch classes for the school
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/classes?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Fetch schedules for the school (нужно для поиска связанных классов)
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", { schoolId }],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await apiRequest(`/api/schedules?schoolId=${schoolId}`); // Предполагаем, что API поддерживает фильтр по schoolId
      return res.json();
    },
    enabled: !!schoolId && isAdmin(),
  });

  // Объединяем предметы и подгруппы в один массив для отображения
  const combinedItems = useMemo(() => {
    // --- DEBUG LOG --- 
    console.log('Recalculating combinedItems. Subjects:', subjects, 'Subgroups:', subgroups);
    // --- END DEBUG LOG ---
    const items: SubjectSubgroupItem[] = [
      ...subjects,
      ...subgroups.map(sg => ({ ...sg, isSubgroup: true }))
    ];

    const filtered = selectedClassFilter === "all"
      ? items
      : items.filter(item => {
          if ('isSubgroup' in item) {
            return item.classId === parseInt(selectedClassFilter);
          }
          return true;
        });

    return filtered.sort((a, b) => {
      const aIsSubgroup = 'isSubgroup' in a;
      const bIsSubgroup = 'isSubgroup' in b;
      if (aIsSubgroup !== bIsSubgroup) return aIsSubgroup ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [subjects, subgroups, selectedClassFilter]);

  const isLoading = subjectsLoading || subgroupsLoading || classesLoading || schedulesLoading;

  // --- Мутации для добавления --- (остаются без изменений)
  const createSubjectMutation = useMutation({
    mutationFn: (data: Omit<InsertSubject, 'schoolId'> & { schoolId: number }) =>
      apiRequest('/api/subjects', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      setIsSubjectDialogOpen(false);
      toast({ title: "Предмет успешно создан" });
    },
    onError: (error: any) => toast({ title: "Ошибка", description: error.message, variant: "destructive" })
  });

  const createSubgroupMutation = useMutation({
    mutationFn: (data: Omit<InsertSubgroup, 'schoolId'> & { schoolId: number }) =>
      apiRequest('/api/subgroups', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });
      setIsSubgroupDialogOpen(false);
      toast({ title: "Подгруппа успешно создана" });
    },
    onError: (error: any) => toast({ title: "Ошибка", description: error.message, variant: "destructive" })
  });

  const handleCreateSubject = (data: Omit<InsertSubject, 'schoolId'>) => {
    if (schoolId) {
      createSubjectMutation.mutate({ ...data, schoolId });
    } else {
      toast({ title: "Ошибка", description: "Не удалось определить ID школы", variant: "destructive" });
    }
  };

  const handleCreateSubgroup = (data: Omit<InsertSubgroup, 'schoolId'> & { studentIds?: number[] }) => {
    if (schoolId) {
      createSubgroupMutation.mutate({ ...data, schoolId });
    } else {
      toast({ title: "Ошибка", description: "Не удалось определить ID школы", variant: "destructive" });
    }
  };

  // --- Обработчики для карточек ---
  const handleCardClick = async (item: SubjectSubgroupItem) => {
    setIsLoadingRelatedClasses(true);
    setSelectedItem(item);
    setRelatedClasses([]); // Очищаем предыдущие классы

    const isSubgroup = 'isSubgroup' in item;
    let relatedScheduleIds: number[] = [];

    if (isSubgroup) {
      // Находим расписания для подгруппы
      relatedScheduleIds = schedules
        .filter(s => s.subgroupId === item.id)
        .map(s => s.classId);
    } else {
      // Находим расписания для предмета
      relatedScheduleIds = schedules
        .filter(s => s.subjectId === item.id)
        .map(s => s.classId);
    }

    const uniqueClassIds = [...new Set(relatedScheduleIds)];
    const relatedClassData = classes.filter(cls => uniqueClassIds.includes(cls.id));

    setRelatedClasses(relatedClassData);
    setIsLoadingRelatedClasses(false);
  };

  const handleClassCardClick = (classData: Class) => {
    if (!selectedItem) return;

    const isSubgroup = 'isSubgroup' in selectedItem;
    const subjectId = isSubgroup ? null : selectedItem.id; // Предмет ID или null для подгруппы
    const subgroupId = isSubgroup ? selectedItem.id : null; // Подгруппа ID или null для предмета

    // Если это подгруппа, нам нужен ID предмета, к которому она относится (через расписание)
    let finalSubjectId = subjectId;
    if (isSubgroup && subgroupId) {
      const scheduleWithSubgroup = schedules.find(s => s.subgroupId === subgroupId && s.classId === classData.id);
      if (scheduleWithSubgroup) {
        finalSubjectId = scheduleWithSubgroup.subjectId;
      } else {
        toast({ title: "Ошибка", description: "Не удалось найти предмет для этой подгруппы в расписании.", variant: "destructive" });
        return;
      }
    }

    if (finalSubjectId === null) {
      toast({ title: "Ошибка", description: "Не удалось определить предмет.", variant: "destructive" });
      return;
    }

    // Формируем URL для перехода к журналу
    const url = `/class-grade-details/${classData.id}/${finalSubjectId}${subgroupId ? `/${subgroupId}` : ''}`;
    navigate(url);
  };

  const handleBackClick = () => {
    setSelectedItem(null);
    setRelatedClasses([]);
  };

  // --- МУТАЦИИ ДЛЯ УДАЛЕНИЯ ---
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subjects/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({ title: "Предмет удалён" });
    },
    onError: (error: any) => toast({ title: "Ошибка", description: error.message, variant: "destructive" })
  });
  const deleteSubgroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subgroups/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      toast({ title: "Подгруппа удалена" });
    },
    onError: (error: any) => toast({ title: "Ошибка", description: error.message, variant: "destructive" })
  });

  // --- МУТАЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ---
  const editSubjectMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<InsertSubject> }) => {
      // Keep logging for now
      console.log("*** DEBUG: Starting subject edit mutation with data:", data);
      const result = await apiRequest(`/api/subjects/${data.id}`, 'PATCH', data.values);
      console.log("*** DEBUG: PATCH request complete, result status:", result.status);
      // Ensure the response body is consumed, even if not used, to prevent issues
      await result.text(); 
      // Check if the request was successful before proceeding
      if (!result.ok) {
        throw new Error(await result.text() || `Failed to update subject ${data.id}`);
      }
      return result; // Or potentially return parsed JSON if needed elsewhere
    },
    onSuccess: (data, variables) => { // variables contains the input data { id, values }
      console.log('*** DEBUG: Edit subject mutation succeeded for ID:', variables.id);

      // 1. Invalidate the query for the subjects list
      // This tells React Query that the data for this key is stale
      // It will automatically refetch in the background.
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });

      // 2. Close the edit dialog
      setIsEditDialogOpen(false);
      setItemToEdit(null);

      // 3. Show success toast
      toast({ title: "Предмет успешно обновлён" });

      // Remove all previous manual fetching, cache clearing, and reloading logic
      /*
      toast({ 
        title: "Запрос на изменение отправлен успешно", 
        description: `Запрошено изменение ...` 
      });
      setTimeout(async () => { ... }, 3000);
      queryClient.clear();
      if (schoolId) { ... }
      setTimeout(() => { window.location.reload(); }, 2000);
      */
    },
    onError: (error: any, variables) => {
      console.error(`*** DEBUG: Edit subject mutation error for ID ${variables.id}:`, error);
      toast({ title: "Ошибка обновления предмета", description: error.message, variant: "destructive" });
      // Consider keeping the dialog open on error?
      // setIsEditDialogOpen(false);
      // setItemToEdit(null);
    }
  });
  const editSubgroupMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<InsertSubgroup> }) => {
      // Add similar logging and error handling as editSubjectMutation
      console.log("*** DEBUG: Starting subgroup edit mutation with data:", data);
      const result = await apiRequest(`/api/subgroups/${data.id}`, 'PATCH', data.values);
      console.log("*** DEBUG: Subgroup PATCH request complete, result status:", result.status);
      // Ensure body is consumed
      await result.text();
      if (!result.ok) {
         throw new Error(await result.text() || `Failed to update subgroup ${data.id}`);
      }
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('*** DEBUG: Edit subgroup mutation succeeded for ID:', variables.id);
      
      // 1. Invalidate the query for the subgroups list
      queryClient.invalidateQueries({ queryKey: ['/api/subgroups', schoolId] });

      // Optionally, invalidate other queries if subgroup changes might affect them
      // (e.g., if combinedItems calculation depends on fresh subgroup data immediately)
      // queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      
      // 2. Close the edit dialog
      setIsEditDialogOpen(false);
      setItemToEdit(null);

      // 3. Show success toast
      toast({ title: "Подгруппа успешно обновлена" });

      // Remove all previous manual fetching, cache clearing, and reloading logic
      /*
      queryClient.clear();
      if (schoolId) { ... }
      window.location.reload();
      */
    },
    onError: (error: any, variables) => {
       console.error(`*** DEBUG: Edit subgroup mutation error for ID ${variables.id}:`, error);
      toast({ title: "Ошибка обновления подгруппы", description: error.message, variant: "destructive" });
    }
  });

  // --- ОБРАБОТЧИКИ ---
  const handleEditItem = (item: SubjectSubgroupItem) => {
    // Open dialog immediately, student fetching will happen inside the dialog
    setItemToEdit(item); // Pass the item as is (studentIds might be missing)
    setIsEditDialogOpen(true);
  };
  const handleDeleteItem = (item: SubjectSubgroupItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {selectedItem ? (
          // Отображение классов для выбранного предмета/подгруппы
          <div>
            <Button variant="outline" onClick={handleBackClick} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Button>
            <h1 className="text-3xl font-bold mb-2">
              Классы для: {selectedItem.name}
            </h1>
            <p className="text-muted-foreground mb-6">
              {'isSubgroup' in selectedItem ? `Подгруппа класса ${classes.find(c => c.id === selectedItem.classId)?.name}` : "Предмет"}
            </p>

            {isLoadingRelatedClasses ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : relatedClasses.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Нет классов, использующих { 'isSubgroup' in selectedItem ? 'эту подгруппу' : 'этот предмет'}.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {relatedClasses.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classData={cls}
                    onClick={handleClassCardClick}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Отображение списка предметов и подгрупп
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h1 className="text-3xl font-bold">Предметы и подгруппы</h1>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => setIsSubjectDialogOpen(true)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" /> Добавить предмет
                </Button>
                <Button onClick={() => setIsSubgroupDialogOpen(true)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" /> Добавить подгруппу
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger className="w-[250px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Фильтр по классу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все классы (для подгрупп)</SelectItem>
                  {classesLoading ? (
                    <SelectItem value="loading" disabled>Загрузка классов...</SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : combinedItems.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {selectedClassFilter === "all"
                    ? "В вашей школе еще нет предметов или подгрупп."
                    : "Для выбранного класса нет подгрупп."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {combinedItems.map((item) => (
                  <SubjectSubgroupCard
                    key={'isSubgroup' in item ? `subgroup-${item.id}` : `subject-${item.id}`}
                    item={item}
                    classes={classes}
                    subjects={subjects}
                    onClick={handleCardClick}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Диалоги для добавления */}
      <SubjectFormDialog
        isOpen={isSubjectDialogOpen}
        onClose={() => setIsSubjectDialogOpen(false)}
        onSubmit={handleCreateSubject}
        isLoading={createSubjectMutation.isPending}
      />
      <SubgroupFormDialog
        isOpen={isSubgroupDialogOpen}
        onClose={() => setIsSubgroupDialogOpen(false)}
        onSubmit={handleCreateSubgroup}
        isLoading={createSubgroupMutation.isPending}
        classes={classes}
        subjects={subjects}
      />

      {/* Диалог удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить {('isSubgroup' in (itemToDelete || {})) ? 'подгруппу' : 'предмет'} "{itemToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!itemToDelete) return;
                if ('isSubgroup' in itemToDelete) {
                  deleteSubgroupMutation.mutate(itemToDelete.id);
                } else {
                  deleteSubjectMutation.mutate(itemToDelete.id);
                }
              }}
              disabled={deleteSubjectMutation.isPending || deleteSubgroupMutation.isPending}
            >
              {deleteSubjectMutation.isPending || deleteSubgroupMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      {isEditDialogOpen && itemToEdit && (
        'isSubgroup' in itemToEdit ? (
          <SubgroupFormDialog
            isOpen={isEditDialogOpen}
            onClose={() => { setIsEditDialogOpen(false); setItemToEdit(null); }}
            onSubmit={(values) => {
              // Оставляем только нужные поля для подгруппы
              const { name, description, classId, studentIds } = values;
              editSubgroupMutation.mutate({ id: itemToEdit.id, values: { name, description, classId: parseInt(classId), studentIds: studentIds?.map(Number) || [] } });
            }}
            isLoading={editSubgroupMutation.isPending}
            classes={classes}
            subjects={subjects}
            // Передаем значения по умолчанию
            defaultValues={{
              name: itemToEdit.name,
              description: itemToEdit.description || "",
              classId: itemToEdit.classId?.toString() || "",
              studentIds: itemToEdit.studentIds ? itemToEdit.studentIds.map(String) : [],
            }}
          />
        ) : (
          <SubjectFormDialog
            isOpen={isEditDialogOpen}
            onClose={() => { setIsEditDialogOpen(false); setItemToEdit(null); }}
            onSubmit={(values) => {
              // Передаём только name и description
              editSubjectMutation.mutate({ id: itemToEdit.id, values: { name: values.name, description: values.description } });
            }}
            isLoading={editSubjectMutation.isPending}
            // Передаем значения по умолчанию
            defaultValues={{
              name: itemToEdit.name,
              description: itemToEdit.description || "",
            }}
          />
        )
      )}
    </MainLayout>
  );
}