// client/src/components/subjects-management/class-card.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Class } from "@shared/schema";
import { Home, Users } from "lucide-react";

interface ClassCardProps {
  classData: Class;
  onClick: (classData: Class) => void;
}

export function ClassCard({ classData, onClick }: ClassCardProps) {
  // Можно добавить запрос количества учеников, если нужно
  const studentCount = 0; // Заглушка

  return (
    <div
      className="cursor-pointer h-full"
      onClick={() => onClick(classData)}
      tabIndex={0} // Делаем div фокусируемым для доступности
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(classData) }}
    >
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow hover:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-purple-500 flex-shrink-0" />
            <span className="truncate" title={classData.name}>{classData.name}</span>
          </CardTitle>
          <CardDescription>
            {classData.gradeLevel} класс • {classData.academicYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span>Учеников: {studentCount}</span> {/* Отображение количества учеников */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}