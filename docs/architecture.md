# Architecture

Pest Patrol OS is a full-stack pest control management system:

## Components
1. Admin Dashboard (Next.js)
2. Technician Mobile App (Expo)
3. Customer Portal (Next.js)
4. Backend (Supabase)

## Core Principles
- Offline-first mobile architecture
- Optimistic UI everywhere
- Real-time sync when online
- Strong data integrity (RLS + triggers)

## Key Systems
- Jobs lifecycle system
- Media + forms engine
- Chemical inventory tracking
- Payment + invoicing system
- Geofencing automation

## Data Flow
Mobile → Offline Queue → Sync → Supabase → Web + Portal

## Critical Features
- Offline sync queue
- Geofence-triggered job updates
- Stripe payments
- Customer media visibility