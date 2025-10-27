import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface AuditLogEntry {
  id: string;
  adminId: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  adminId?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Log an admin action to the audit log
 */
export async function logAction(
  adminId: string,
  actionType: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, any> | null = null,
  ipAddress: string | null = null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        changes: changes,
        ip_address: ipAddress
      });

    if (error) {
      logger.error('Failed to log audit action', {
        adminId,
        actionType,
        entityType,
        entityId,
        error: error.message
      });
      throw error;
    }

    logger.info('Audit action logged', {
      adminId,
      actionType,
      entityType,
      entityId,
      hasChanges: !!changes
    });
  } catch (error) {
    logger.error('Error logging audit action', {
      adminId,
      actionType,
      entityType,
      entityId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get audit log entries with filters
 */
export async function getAuditLog(filters: AuditLogFilters = {}): Promise<{
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const {
      adminId,
      actionType,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' });

    // Apply filters
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch audit log', {
        filters,
        error: error.message
      });
      throw error;
    }

    const entries: AuditLogEntry[] = (data || []).map(entry => ({
      id: entry.id,
      adminId: entry.admin_id,
      actionType: entry.action_type,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      changes: entry.changes,
      ipAddress: entry.ip_address,
      createdAt: entry.created_at
    }));

    logger.info('Audit log fetched', {
      filters,
      resultCount: entries.length,
      total: count || 0
    });

    return {
      entries,
      total: count || 0,
      page,
      limit
    };
  } catch (error) {
    logger.error('Error fetching audit log', {
      filters,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}