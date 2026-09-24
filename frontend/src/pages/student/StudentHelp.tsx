import { HelpCircle, BookOpen, Calculator, AlertCircle, Phone, Mail, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const examRules = [
  "Read each question carefully before answering.",
  "Each question carries 4 marks for a correct answer.",
  "Negative marking: 1 mark will be deducted for each wrong answer.",
  "No marks will be deducted for unattempted questions.",
  "Once you submit the exam, you cannot go back or modify answers.",
  "The timer will auto-submit your exam when time expires.",
  "Do not refresh the page during the exam.",
  "Use the 'Mark for Review' feature to revisit questions later.",
  "Ensure stable internet connection throughout the exam.",
  "Contact support immediately if you face technical issues.",
];

const markingScheme = [
  { type: 'Correct Answer', marks: '+4', color: 'text-success' },
  { type: 'Wrong Answer', marks: '-1', color: 'text-destructive' },
  { type: 'Unattempted', marks: '0', color: 'text-muted-foreground' },
];

const troubleshooting = [
  {
    question: "What should I do if my exam gets stuck?",
    answer: "Try refreshing the page. Your progress is auto-saved. If the issue persists, contact support immediately with your test ID.",
  },
  {
    question: "My timer stopped working. What should I do?",
    answer: "Refresh the page immediately. The server keeps track of actual time, so don't worry about losing time.",
  },
  {
    question: "I accidentally closed the browser during exam.",
    answer: "Open the exam link again and log in. You can continue from where you left off if time permits.",
  },
  {
    question: "I can't see the Submit button.",
    answer: "Navigate to the last question using Next button. The Submit button appears on the last question page.",
  },
  {
    question: "My answer didn't save.",
    answer: "Answers are auto-saved when you select an option. If you see issues, try selecting the option again.",
  },
];

export default function StudentHelp() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help & Instructions</h1>
          <p className="text-muted-foreground mt-1">Everything you need to know about exams</p>
        </div>

        {/* Exam Rules */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Exam Rules & Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {examRules.map((rule, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Marking Scheme */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Marking Scheme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {markingScheme.map((item) => (
                <div
                  key={item.type}
                  className="p-3 sm:p-4 rounded-xl bg-muted/50 text-center"
                >
                  <p className={cn("text-xl sm:text-2xl font-bold", item.color)}>{item.marks}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{item.type}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 sm:p-4 rounded-xl bg-warning/10 border border-warning/30">
              <p className="text-xs sm:text-sm text-warning flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Negative marking applies. Attempt only if you are confident about the answer.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting FAQ */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Common Issues & Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {troubleshooting.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Need help? Our support team is available 24/7 during exam hours.
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="tel:+911234567890"
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Us</p>
                  <p className="font-medium text-foreground">+91 123 456 7890</p>
                </div>
              </a>
              
              <a
                href="mailto:support@examprep.com"
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Us</p>
                  <p className="font-medium text-foreground">support@examprep.com</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
