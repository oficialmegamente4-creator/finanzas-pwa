import { Activity, BriefcaseBusiness, Bus, Gift, GraduationCap, HeartPulse, House, Laptop, Utensils, Wallet, Wrench, ShoppingBag, CircleHelp } from 'lucide-react'
import type { Category, TransactionType } from '../types'

export const CATEGORIES: readonly Category[] = [
  { name: 'Comida', type: 'expense', color: '#e76f51', icon: Utensils },
  { name: 'Transporte', type: 'expense', color: '#457b9d', icon: Bus },
  { name: 'Vivienda', type: 'expense', color: '#7b2cbf', icon: House },
  { name: 'Servicios', type: 'expense', color: '#d4a017', icon: Wrench },
  { name: 'Salud', type: 'expense', color: '#2a9d8f', icon: HeartPulse },
  { name: 'Educación', type: 'expense', color: '#4361ee', icon: GraduationCap },
  { name: 'Ocio', type: 'expense', color: '#c44569', icon: Activity },
  { name: 'Compras', type: 'expense', color: '#718355', icon: ShoppingBag },
  { name: 'Otros gastos', type: 'expense', color: '#6b7280', icon: CircleHelp },
  { name: 'Salario', type: 'income', color: '#15803d', icon: BriefcaseBusiness },
  { name: 'Freelance', type: 'income', color: '#0f766e', icon: Laptop },
  { name: 'Inversiones', type: 'income', color: '#1d4ed8', icon: Wallet },
  { name: 'Regalos', type: 'income', color: '#a21caf', icon: Gift },
  { name: 'Otros ingresos', type: 'income', color: '#4b5563', icon: CircleHelp },
]

export const getCategories = (type: TransactionType): readonly Category[] => CATEGORIES.filter((item) => item.type === type)
export const isValidCategory = (type: TransactionType, name: string): boolean => getCategories(type).some((item) => item.name === name)
