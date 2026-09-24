import { useState } from 'react';
import { Search, Mail, MessageSquare, Phone, Filter } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationLog } from '@/types/admin';

const mockLogs: NotificationLog[] = [
  {
    id: '1',
    type: 'email',
    recipient: 'rahul@example.com',
    message: 'Your test result is ready. Score: 156/180',
    status: 'sent',
    sentAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    type: 'sms',
    recipient: '+91 98765 43210',
    message: 'Test reminder: Physics Mock Test starts in 1 hour',
    status: 'sent',
    sentAt: new Date('2024-01-15T09:00:00'),
  },
  {
    id: '3',
    type: 'whatsapp',
    recipient: '+91 98765 43211',
    message: 'Welcome to IQARENA! Your account has been created.',
    status: 'sent',
    sentAt: new Date('2024-01-14T14:20:00'),
  },
  {
    id: '4',
    type: 'email',
    recipient: 'priya@example.com',
    message: 'New batch assignment: NEET 2024 - Batch A',
    status: 'failed',
    sentAt: new Date('2024-01-14T11:15:00'),
  },
  {
    id: '5',
    type: 'sms',
    recipient: '+91 98765 43212',
    message: 'Payment received. Amount: ₹15,000',
    status: 'pending',
    sentAt: new Date('2024-01-15T15:30:00'),
  },
];

const typeIcons = {
  sms: Phone,
  email: Mail,
  whatsapp: MessageSquare,
};

const statusStyles = {
  sent: 'bg-success/10 text-success border-success/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
};

export default function NotificationLogs() {
  const [logs] = useState<NotificationLog[]>(mockLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getLogsByType = (type: string) => {
    if (type === 'all') return filteredLogs;
    return filteredLogs.filter((log) => log.type === type);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Notification Logs</h1>
          <p className="page-subtitle">View SMS, Email, and WhatsApp logs</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by recipient or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input type="date" className="w-[180px]" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1">
                {logs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <Phone className="w-4 h-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {['all', 'sms', 'email', 'whatsapp'].map((type) => (
            <TabsContent key={type} value={type} className="mt-6">
              <div className="table-container overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                        Type
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                        Recipient
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                        Message
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                        Status
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {getLogsByType(type).map((log) => {
                      const Icon = typeIcons[log.type];
                      return (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-2 rounded-lg ${
                                  log.type === 'sms'
                                    ? 'bg-info/10 text-info'
                                    : log.type === 'email'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-success/10 text-success'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium capitalize">
                                {log.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-foreground">{log.recipient}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                              {log.message}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={statusStyles[log.status]}>
                              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">
                              {log.sentAt.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
