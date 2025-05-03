// client/src/components/subjects-management/subject-subgroup-card.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Subject, Subgroup, Class } from "@shared/schema";
import { BookOpen, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

// Добавляем тип для элемента списка
export type SubjectSubgroupItem = Subject | (Subgroup & { isSubgroup: boolean });

interface SubjectSubgroupCardProps {
  item: SubjectSubgroupItem;
  classes: Class[];
  subjects: Subject[];
  onClick: (item: SubjectSubgroupItem) => void; // Обработчик клика по карточке
  onEdit: (item: SubjectSubgroupItem) => void; // Обработчик редактирования
  onDelete: (item: SubjectSubgroupItem) => void; // Обработчик удаления
}

export function SubjectSubgroupCard({ item, classes, subjects, onClick, onEdit, onDelete }: SubjectSubgroupCardProps) {
  const isSubgroup = 'isSubgroup' in item;

  const className = useMemo(() => {
    if (isSubgroup) {
      const cls = classes.find(c => c.id === item.classId);
      return cls ? cls.name : `Класс ${item.classId}`;
    }
    return null;
  }, [item, classes, isSubgroup]);

  // Обернем Card в div с onClick
  return (
    <div
      className="cursor-pointer h-full"
      onClick={() => onClick(item)}
      tabIndex={0} // Делаем div фокусируемым для доступности
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(item) }}
    >
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow hover:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {isSubgroup ? <Users className="h-5 w-5 text-blue-500 flex-shrink-0" /> : <BookOpen className="h-5 w-5 text-green-500 flex-shrink-0" />}
            <span className="truncate" title={item.name}>{item.name}</span>
          </CardTitle>
          <CardDescription>
            {isSubgroup ? `Подгруппа класса ${className}` : "Предмет"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-3"> {/* Ограничим описание */}
            {item.description || (isSubgroup ? "Нет описания подгруппы" : "Нет описания предмета")}
          </p>
        </CardContent>
        <CardFooter className="pt-2 flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Редактировать"
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем клик по карточке
              onEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive/90"
            title="Удалить"
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем клик по карточке
              onDelete(item);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}