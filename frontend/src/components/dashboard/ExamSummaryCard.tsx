import { ExamType } from '@/types/admin';
import { cn } from '@/lib/utils';
import { Stethoscope, FlaskConical } from 'lucide-react';

interface ExamSummaryCardProps {
  examType: ExamType;
  studentCount: number;
  testCount: number;
  questionCount: number;
}

export function ExamSummaryCard({
  examType,
  studentCount,
  testCount,
  questionCount,
}: ExamSummaryCardProps) {
  const isNEET = examType === 'NEET';
  
  console.log(`🎴 ExamSummaryCard Rendering - ${examType}:`, {
    studentCount,
    testCount,
    questionCount
  });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 text-primary-foreground',
        isNEET
          ? 'bg-gradient-to-br from-primary to-orange-500'
          : 'bg-gradient-to-br from-info to-blue-600'
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-foreground/20">
            {isNEET ? (
              <Stethoscope className="w-6 h-6" />
            ) : (
              <FlaskConical className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-xl font-display font-bold">{examType}</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{studentCount}</p>
            <p className="text-sm opacity-80">Students</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{testCount}</p>
            <p className="text-sm opacity-80">Tests</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{questionCount}</p>
            <p className="text-sm opacity-80">Questions</p>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -right-4 -bottom-4 opacity-10">
        {isNEET ? (
          <Stethoscope className="w-32 h-32" />
        ) : (
          <FlaskConical className="w-32 h-32" />
        )}
      </div>
    </div>
  );
}
