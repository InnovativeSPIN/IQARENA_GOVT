import { UserPlus, BookPlus, ClipboardPlus, Users, FilePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  {
    icon: UserPlus,
    label: 'Add Student',
    description: 'Register new student',
    path: '/admin/users',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: BookPlus,
    label: 'Create Test',
    description: 'Setup new examination',
    path: '/admin/tests',
    color: 'bg-success/10 text-success',
  },
  {
    icon: ClipboardPlus,
    label: 'Add Question',
    description: 'Add to question bank',
    path: '/admin/questions',
    color: 'bg-info/10 text-info',
  },
  {
    icon: FilePlus,
    label: 'Add Exam',
    description: 'Create or manage exams',
    path: '/admin/exams',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    label: 'Create Batch',
    description: 'Create a new batch',
    path: '/admin/batches',
    color: 'bg-warning/10 text-warning',
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className="quick-action text-left"
        >
          <div className={`p-2.5 rounded-lg ${action.color}`}>
            <action.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{action.label}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
