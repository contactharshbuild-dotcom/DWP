export interface SubscriptionPlanItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  currency: 'USD' | 'INR';
  monthly_price: number;
  yearly_price: number;
  max_teachers: number;
  max_students: number;
  max_quizzes: number;
  max_documents: number;
  max_practical_exams: number;
  is_active: boolean;
  is_featured: boolean;
  organization_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationItem {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  logo_url?: string;
  logoUrl?: string;
  subscription_plan_id?: number | null;
  subscriptionPlan?: SubscriptionPlanItem | null;
  billing_cycle?: 'monthly' | 'yearly';
  subscription_status?: string;
  subscription_expires_at?: string;
}
