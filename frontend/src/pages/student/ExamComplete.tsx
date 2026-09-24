import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, BarChart3, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AttemptSummary {
  totalQuestions: number;
  attempted: number;
  unattempted: number;
  markedForReview: number;
  score?: number;
  totalMarks?: number;
  percentage?: number;
}

export default function ExamComplete() {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AttemptSummary>({
    totalQuestions: 0,
    attempted: 0,
    unattempted: 0,
    markedForReview: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get data from navigation state first
    if (location.state?.summary) {
      setSummary(location.state.summary);
      setLoading(false);
    } else {
      // Otherwise fetch from API
      const fetchSummary = async () => {
        try {
          // In a real scenario, you'd fetch the last attempt summary
          // For now, redirect back if no data
          navigate('/student');
        } catch (error) {
          console.error('Error fetching summary:', error);
          navigate('/student');
        }
      };
      fetchSummary();
    }
  }, [testId, location.state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Exam Submitted Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your answers have been saved securely.
          </p>

          {/* Score Display (if available) */}
          {summary.score !== undefined && summary.totalMarks !== undefined && (
            <div className="bg-primary/10 rounded-xl p-5 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Score</p>
                <p className="text-4xl font-bold text-primary mb-1">
                  {summary.score}/{summary.totalMarks}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {summary.percentage?.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Summary Card */}
          <div className="bg-muted/50 rounded-xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-foreground mb-4">Test Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-semibold text-foreground">{summary.totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attempted</span>
                <span className="font-semibold text-success">{summary.attempted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unattempted</span>
                <span className="font-semibold text-destructive">{summary.unattempted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marked for Review</span>
                <span className="font-semibold text-warning">{summary.markedForReview}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-accent/50 border border-accent rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-accent-foreground">
              Results will be available once they are released by your instructor. You'll receive a notification when ready.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link to="/student/results" className="block">
              <Button className="w-full gap-2">
                <BarChart3 className="h-4 w-4" />
                View Results
              </Button>
            </Link>
            <Link to="/student" className="block">
              <Button variant="outline" className="w-full gap-2">
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
