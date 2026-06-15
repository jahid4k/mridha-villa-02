import { connectDB } from '@/lib/db';
import AuditLog, { AuditAction, EntityType } from '@/models/AuditLog';

interface CreateAuditLogParams {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  changedFields?: string[];
  note?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      ...params,
      performedAt: new Date(),
    });
  } catch (error) {
    // Audit log failure should not break the main operation
    console.error('Failed to create audit log:', error);
  }
}

export function getChangedFields(
  previousData: Record<string, any>,
  newData: Record<string, any>
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const prev = JSON.stringify(previousData[key]);
    const next = JSON.stringify(newData[key]);
    if (prev !== next) {
      changed.push(key);
    }
  }

  return changed;
}

export function sanitizeForAudit(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  // Remove sensitive fields from audit logs
  delete sanitized.password;
  delete sanitized.__v;
  return sanitized;
}
