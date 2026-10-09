import { HelpCircle, BookOpen, Calculator, AlertCircle, Phone, Mail, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StudentHelp() {
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const examRules = [
    t("Read each question carefully before answering.", "Read each question carefully before answering."),
    t("Each question carries 4 marks for a correct answer.", "Each question carries 4 marks for a correct answer."),
    t("Negative marking: 1 mark will be deducted for each wrong answer.", "Negative marking: 1 mark will be deducted for each wrong answer."),
    t("No marks will be deducted for unattempted questions.", "No marks will be deducted for unattempted questions."),
    t("Once you submit the exam, you cannot go back or modify answers.", "Once you submit the exam, you cannot go back or modify answers."),
    t("The timer will auto-submit your exam when time expires.", "The timer will auto-submit your exam when time expires."),
    t("Do not refresh the page during the exam.", "Do not refresh the page during the exam."),
    t("Use the 'Mark for Review' feature to revisit questions later.", "Use the 'Mark for Review' feature to revisit questions later."),
    t("Ensure stable internet connection throughout the exam.", "Ensure stable internet connection throughout the exam."),
    t("Contact support immediately if you face technical issues.", "Contact support immediately if you face technical issues."),
  ];

  const markingScheme = [
    { type: t('Correct Answer', 'Correct Answer'), marks: '+4', color: 'text-success' },
    { type: t('Wrong Answer', 'Wrong Answer'), marks: '-1', color: 'text-destructive' },
    { type: t('Unattempted', 'Unattempted'), marks: '0', color: 'text-muted-foreground' },
  ];

  const troubleshooting = [
    {
      question: t("What should I do if my exam gets stuck?", "What should I do if my exam gets stuck?"),
      answer: t("Try refreshing the page. Your progress is auto-saved. If the issue persists, contact support immediately with your test ID.", "Try refreshing the page. Your progress is auto-saved. If the issue persists, contact support immediately with your test ID."),
    },
    {
      question: t("My timer stopped working. What should I do?", "My timer stopped working. What should I do?"),
      answer: t("Refresh the page immediately. The server keeps track of actual time, so don't worry about losing time.", "Refresh the page immediately. The server keeps track of actual time, so don't worry about losing time."),
    },
    {
      question: t("I accidentally closed the browser during exam.", "I accidentally closed the browser during exam."),
      answer: t("Open the exam link again and log in. You can continue from where you left off if time permits.", "Open the exam link again and log in. You can continue from where you left off if time permits."),
    },
    {
      question: t("I can't see the Submit button.", "I can't see the Submit button."),
      answer: t("Navigate to the last question using Next button. The Submit button appears on the last question page.", "Navigate to the last question using Next button. The Submit button appears on the last question page."),
    },
    {
      question: t("My answer didn't save.", "My answer didn't save."),
      answer: t("Answers are auto-saved when you select an option. If you see issues, try selecting the option again.", "Answers are auto-saved when you select an option. If you see issues, try selecting the option again."),
    },
  ];

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Help & Instructions', 'Help & Instructions')}</h1>
          <p className="text-muted-foreground mt-1">{t('Everything you need to know about exams', 'Everything you need to know about exams')}</p>
        </div>

        {/* Exam Rules */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('Exam Rules & Guidelines', 'Exam Rules & Guidelines')}
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
              {t('Marking Scheme', 'Marking Scheme')}
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
                {t('Negative marking applies. Attempt only if you are confident about the answer.', 'Negative marking applies. Attempt only if you are confident about the answer.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting FAQ */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {t('Common Issues & Solutions', 'Common Issues & Solutions')}
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
              {t('Contact Support', 'Contact Support')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('Need help? Our support team is available 24/7 during exam hours.', 'Need help? Our support team is available 24/7 during exam hours.')}
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
                  <p className="text-sm text-muted-foreground">{t('Call Us', 'Call Us')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('Email Us', 'Email Us')}</p>
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
